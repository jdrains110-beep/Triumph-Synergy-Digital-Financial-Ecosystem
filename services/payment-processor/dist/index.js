"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentProcessor = void 0;
const node_cluster_1 = __importDefault(require("node:cluster"));
const node_http_1 = __importDefault(require("node:http"));
const node_os_1 = __importDefault(require("node:os"));
const postgres_1 = __importDefault(require("postgres"));
const redis_1 = require("redis");
class PaymentProcessor {
    constructor() {
        this.batchSize = 1000;
        this.processingInterval = 100; // ms
        this.workersCount = Number(process.env.WORKER_THREADS) || node_os_1.default.cpus().length;
        this.redis = (0, redis_1.createClient)({
            url: process.env.REDIS_URL || "redis://localhost:6379",
        });
        this.db = (0, postgres_1.default)(process.env.POSTGRES_URL || "");
    }
    async initialize() {
        await this.redis.connect();
        console.log("✅ Connected to Redis");
        // Test database connection
        await this.db `SELECT 1`;
        console.log("✅ Connected to PostgreSQL");
        // Create tables if not exist
        await this.createTables();
    }
    async createTables() {
        await this.db `
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
        await this.db `
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
    async queuePayment(payment) {
        const paymentData = {
            ...payment,
            status: "pending",
            created_at: new Date(),
        };
        // Store in database
        await this.db `
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
        const payments = await this.redis.lRange("payment_queue", 0, this.batchSize - 1);
        if (payments.length === 0) {
            return { processed: 0, duration: 0 };
        }
        console.log(`📦 Processing batch of ${payments.length} payments...`);
        const promises = payments.map(async (paymentJson) => {
            try {
                const payment = JSON.parse(paymentJson);
                await this.processPayment(payment);
                // Remove from queue after successful processing
                await this.redis.lRem("payment_queue", 1, paymentJson);
            }
            catch (error) {
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
    async processPayment(payment) {
        try {
            // Update status to processing
            await this
                .db `UPDATE pi_payments SET status = 'processing', updated_at = NOW() WHERE payment_id = ${payment.payment_id}`;
            // Call Pi Network API (mock implementation)
            const piResponse = await this.callPiNetworkAPI(payment);
            // Update with result
            await this.db `
        UPDATE pi_payments
        SET status = ${piResponse.status}, pi_transaction_id = ${piResponse.transaction_id}, processed_at = NOW(), updated_at = NOW()
        WHERE payment_id = ${payment.payment_id}
      `;
            // Log event
            await this.db `
        INSERT INTO pi_payment_logs (payment_id, event_type, event_data, created_at)
        VALUES (${payment.payment_id}, 'processed', ${JSON.stringify(piResponse)}, NOW())
      `;
            // Cache result in Redis (1 hour TTL)
            await this.redis.setEx(`payment:${payment.payment_id}`, 3600, JSON.stringify({ ...payment, ...piResponse }));
        }
        catch (error) {
            console.error(`❌ Payment ${payment.payment_id} failed:`, error);
            await this
                .db `UPDATE pi_payments SET status = 'failed', updated_at = NOW() WHERE payment_id = ${payment.payment_id}`;
            throw error;
        }
    }
    /**
     * Mock Pi Network API call - Replace with actual Pi SDK
     */
    async callPiNetworkAPI(_payment) {
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
            status: "completed",
            transaction_id: `pi_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            confirmed: true,
        };
    }
    /**
     * Start continuous processing
     */
    async startProcessing() {
        console.log(`🚀 Starting payment processor with ${this.workersCount} workers`);
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
                    await new Promise((resolve) => setTimeout(resolve, this.processingInterval));
                }
            }
            catch (error) {
                console.error("❌ Processing error:", error);
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
        }
    }
    /**
     * Get payment status
     */
    async getPaymentStatus(paymentId) {
        // Try cache first
        const cached = await this.redis.get(`payment:${paymentId}`);
        if (cached) {
            return JSON.parse(cached);
        }
        // Fall back to database
        const result = await this
            .db `SELECT * FROM pi_payments WHERE payment_id = ${paymentId}`;
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
        const dbStats = await this.db `
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
        this.db.end?.();
    }
}
exports.PaymentProcessor = PaymentProcessor;
// Cluster mode for multiple CPU cores
if (node_cluster_1.default.isPrimary && process.env.NODE_ENV === "production") {
    const numCPUs = Math.min(node_os_1.default.cpus().length, Number(process.env.WORKER_THREADS) || 4);
    console.log(`🎯 Master process starting ${numCPUs} workers`);
    // Health + Prometheus metrics server on master
    let masterQueueSize = 0;
    let masterProcessed = 0;
    process.on('message', (msg) => {
        if (msg?.type === 'stats') {
            masterQueueSize = msg.queueSize ?? 0;
            masterProcessed += msg.processed ?? 0;
        }
    });
    const healthServer = node_http_1.default.createServer((req, res) => {
        const url = req.url?.split('?')[0];
        if (url === '/metrics') {
            const lines = [
                '# HELP triumph_payment_processor_workers Active worker count',
                '# TYPE triumph_payment_processor_workers gauge',
                `triumph_payment_processor_workers ${numCPUs}`,
                '# HELP triumph_payment_processor_uptime_seconds Process uptime',
                '# TYPE triumph_payment_processor_uptime_seconds counter',
                `triumph_payment_processor_uptime_seconds ${process.uptime().toFixed(3)}`,
                '# HELP triumph_payment_queue_size Current queue depth',
                '# TYPE triumph_payment_queue_size gauge',
                `triumph_payment_queue_size ${masterQueueSize}`,
                '# HELP triumph_payments_processed_total Total payments processed',
                '# TYPE triumph_payments_processed_total counter',
                `triumph_payments_processed_total ${masterProcessed}`,
                '# HELP process_resident_memory_bytes Resident memory',
                '# TYPE process_resident_memory_bytes gauge',
                `process_resident_memory_bytes ${process.memoryUsage().rss}`,
            ];
            res.writeHead(200, { 'Content-Type': 'text/plain; version=0.0.4; charset=utf-8' });
            res.end(lines.join('\n') + '\n');
        }
        else {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'healthy', workers: numCPUs, uptime: process.uptime() }));
        }
    });
    healthServer.listen(8084, "0.0.0.0", () => {
        console.log("🩺 Health+metrics endpoint listening on :8084");
    });
    for (let i = 0; i < numCPUs; i++) {
        node_cluster_1.default.fork();
    }
    node_cluster_1.default.on("exit", (worker, _code, _signal) => {
        console.log(`⚠️  Worker ${worker.process.pid} died. Starting new worker...`);
        node_cluster_1.default.fork();
    });
}
else {
    // Worker process
    const processor = new PaymentProcessor();
    processor.initialize().then(() => {
        // Single-process mode health + metrics
        if (!node_cluster_1.default.isWorker) {
            const healthServer = node_http_1.default.createServer((req, res) => {
                const url = req.url?.split('?')[0];
                if (url === '/metrics') {
                    const lines = [
                        '# HELP triumph_payment_processor_uptime_seconds Process uptime',
                        '# TYPE triumph_payment_processor_uptime_seconds counter',
                        `triumph_payment_processor_uptime_seconds ${process.uptime().toFixed(3)}`,
                        '# HELP process_resident_memory_bytes Resident memory',
                        '# TYPE process_resident_memory_bytes gauge',
                        `process_resident_memory_bytes ${process.memoryUsage().rss}`,
                    ];
                    res.writeHead(200, { 'Content-Type': 'text/plain; version=0.0.4; charset=utf-8' });
                    res.end(lines.join('\n') + '\n');
                }
                else {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'healthy', uptime: process.uptime() }));
                }
            });
            healthServer.listen(8084, "0.0.0.0", () => {
                console.log("🩺 Health+metrics endpoint listening on :8084");
            });
        }
        processor.startProcessing().catch(console.error);
    });
    // Graceful shutdown
    process.on("SIGTERM", async () => {
        console.log("💤 Shutting down gracefully...");
        await processor.close();
        process.exit(0);
    });
}
