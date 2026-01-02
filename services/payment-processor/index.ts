import cluster from "cluster";
import os from "os";
import postgres from "postgres";
import { createClient } from "redis";
import { Worker } from "worker_threads";

interface PiPayment {
  payment_id: string;
  user_id: string;
  amount: number;
  status: "pending" | "processing" | "completed" | "failed";
  pi_transaction_id?: string;
  metadata: Record<string, any>;
  created_at: Date;
}

class PaymentProcessor {
  private redis: ReturnType<typeof createClient>;
  private db: ReturnType<typeof postgres>;
  private workersCount: number;
  private batchSize = 1000;
  private processingInterval = 100; // ms

  constructor() {
    this.workersCount = Number(process.env.WORKER_THREADS) || os.cpus().length;

    this.redis = createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
    });

    this.db = postgres(process.env.POSTGRES_URL || "");
  }

  async initialize() {
    await this.redis.connect();
    console.log("✅ Connected to Redis");

    // Test database connection
    await this.db`SELECT 1`;
    console.log("✅ Connected to PostgreSQL");

    // Create tables if not exist
    await this.createTables();
  }

  private async createTables() {
    await this.db`
      CREATE TABLE IF NOT EXISTS pi_payments (
        payment_id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        amount DECIMAL(20, 7) NOT NULL,
        status VARCHAR(50) NOT NULL,
        pi_transaction_id VARCHAR(255),
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        processed_at TIMESTAMP
      )
    `;

    await this.db`
      CREATE TABLE IF NOT EXISTS pi_payment_logs (
        id SERIAL PRIMARY KEY,
        payment_id VARCHAR(255) NOT NULL,
        event_type VARCHAR(100) NOT NULL,
        event_data JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
  }

  /**
   * Queue payment for processing
   */
  async queuePayment(payment: Omit<PiPayment, "created_at" | "status">) {
    const paymentData: PiPayment = {
      ...payment,
      status: "pending",
      created_at: new Date(),
    };

    // Store in database
    await this.db`
      INSERT INTO pi_payments (payment_id, user_id, amount, status, metadata, created_at)
      VALUES (${paymentData.payment_id}, ${paymentData.user_id}, ${paymentData.amount}, ${paymentData.status}, ${JSON.stringify(paymentData.metadata)}, ${paymentData.created_at})
      ON CONFLICT (payment_id) DO NOTHING
    `;

    // Queue in Redis for processing
    await this.redis.lPush("payment_queue", JSON.stringify(paymentData));

    console.log(`✅ Queued payment: ${paymentData.payment_id}`);
    return paymentData;
  }

  /**
   * Process payments in batches
   */
  async processBatch() {
    const startTime = Date.now();

    // Get batch of payments
    const payments: string[] = await this.redis.lRange(
      "payment_queue",
      0,
      this.batchSize - 1
    );

    if (payments.length === 0) {
      return { processed: 0, duration: 0 };
    }

    console.log(`📦 Processing batch of ${payments.length} payments...`);

    const promises = payments.map(async (paymentJson) => {
      try {
        const payment: PiPayment = JSON.parse(paymentJson);
        await this.processPayment(payment);

        // Remove from queue after successful processing
        await this.redis.lRem("payment_queue", 1, paymentJson);
      } catch (error) {
        console.error("❌ Error processing payment:", error);
        // Move to dead letter queue
        await this.redis.lPush("payment_dlq", paymentJson);
      }
    });

    await Promise.all(promises);

    const duration = Date.now() - startTime;
    console.log(`✅ Processed ${payments.length} payments in ${duration}ms`);

    return { processed: payments.length, duration };
  }

  /**
   * Process individual payment
   */
  private async processPayment(payment: PiPayment) {
    try {
      // Update status to processing
      await this
        .db`UPDATE pi_payments SET status = 'processing', updated_at = NOW() WHERE payment_id = ${payment.payment_id}`;

      // Call Pi Network API (mock implementation)
      const piResponse = await this.callPiNetworkAPI(payment);

      // Update with result
      await this.db`
        UPDATE pi_payments
        SET status = ${piResponse.status}, pi_transaction_id = ${piResponse.transaction_id}, processed_at = NOW(), updated_at = NOW()
        WHERE payment_id = ${payment.payment_id}
      `;

      // Log event
      await this.db`
        INSERT INTO pi_payment_logs (payment_id, event_type, event_data, created_at)
        VALUES (${payment.payment_id}, 'processed', ${JSON.stringify(piResponse)}, NOW())
      `;

      // Cache result in Redis (1 hour TTL)
      await this.redis.setEx(
        `payment:${payment.payment_id}`,
        3600,
        JSON.stringify({ ...payment, ...piResponse })
      );
    } catch (error) {
      console.error(`❌ Payment ${payment.payment_id} failed:`, error);

      await this
        .db`UPDATE pi_payments SET status = 'failed', updated_at = NOW() WHERE payment_id = ${payment.payment_id}`;

      throw error;
    }
  }

  /**
   * Mock Pi Network API call - Replace with actual Pi SDK
   */
  private async callPiNetworkAPI(payment: PiPayment) {
    // TODO: Replace with actual Pi Network SDK integration
    // const piPayment = await piSDK.createPayment({
    //   amount: payment.amount,
    //   memo: payment.metadata.memo,
    //   metadata: payment.metadata,
    //   uid: payment.user_id,
    // });

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 10));

    return {
      status: "completed" as const,
      transaction_id: `pi_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      confirmed: true,
    };
  }

  /**
   * Start continuous processing
   */
  async startProcessing() {
    console.log(
      `🚀 Starting payment processor with ${this.workersCount} workers`
    );

    while (true) {
      try {
        const stats = await this.processBatch();

        // Log stats every 100 batches
        const queueLength = await this.redis.lLen("payment_queue");
        if (queueLength > 0) {
          console.log(`📊 Queue length: ${queueLength}`);
        }

        // Short sleep if no payments to process
        if (stats.processed === 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, this.processingInterval)
          );
        }
      } catch (error) {
        console.error("❌ Processing error:", error);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentId: string) {
    // Try cache first
    const cached = await this.redis.get(`payment:${paymentId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fall back to database
    const result = await this
      .db`SELECT * FROM pi_payments WHERE payment_id = ${paymentId}`;

    return result[0] || null;
  }

  /**
   * Get statistics
   */
  async getStats() {
    const [queueLength, dlqLength] = await Promise.all([
      this.redis.lLen("payment_queue"),
      this.redis.lLen("payment_dlq"),
    ]);

    const dbStats = await this.db`
      SELECT 
        status,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM pi_payments
      WHERE created_at > NOW() - INTERVAL '1 hour'
      GROUP BY status
    `;

    return {
      queue_length: queueLength,
      dead_letter_queue: dlqLength,
      hourly_stats: dbStats,
    };
  }

  async close() {
    await this.redis.quit();
    (this.db as any).end?.();
  }
}

// Cluster mode for multiple CPU cores
if (cluster.isPrimary && process.env.NODE_ENV === "production") {
  const numCPUs = os.cpus().length;
  console.log(`🎯 Master process starting ${numCPUs} workers`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    console.log(`⚠️  Worker ${worker.process.pid} died. Starting new worker...`);
    cluster.fork();
  });
} else {
  // Worker process
  const processor = new PaymentProcessor();

  processor.initialize().then(() => {
    processor.startProcessing().catch(console.error);
  });

  // Graceful shutdown
  process.on("SIGTERM", async () => {
    console.log("💤 Shutting down gracefully...");
    await processor.close();
    process.exit(0);
  });
}

export { PaymentProcessor };
