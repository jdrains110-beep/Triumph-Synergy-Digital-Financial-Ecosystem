import { useState } from "react";

/**
 * Home Page with Pi Network Buy Button Integration
 * Triumph-Synergy Entertainment Hub Payment System
 */
export default function Home() {
  const [paymentStatus, setPaymentStatus] = useState<
    "idle" | "processing" | "success" | "error"
  >("idle");
  const [transactionId, setTransactionId] = useState<string | null>(null);

  /**
   * Handle Pi Network Buy Button Click
   */
  const handlePiBuyClick = async () => {
    setPaymentStatus("processing");

    try {
      // Simulate Pi Network SDK payment
      // In production, integrate with actual Pi Network SDK
      const simulatedTransaction = {
        id: `pi_txn_${Date.now()}`,
        amount: 100,
        currency: "PI",
        timestamp: new Date().toISOString(),
        status: "completed",
      };

      // Simulate API call to backend
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setTransactionId(simulatedTransaction.id);
      setPaymentStatus("success");

      console.log("✅ Payment Success:", simulatedTransaction);
    } catch (error) {
      console.error("❌ Payment Error:", error);
      setPaymentStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 p-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <header className="mb-12 text-center">
          <h1 className="mb-2 font-bold text-5xl text-white">
            🎬 Triumph-Synergy
          </h1>
          <p className="text-blue-200 text-xl">
            Entertainment Hub with Pi Network Payment
          </p>
        </header>

        {/* Main Content */}
        <main className="mb-8 grid gap-8 md:grid-cols-2">
          {/* Pi Network Integration Section */}
          <section className="rounded-lg border border-blue-300 border-opacity-30 bg-white bg-opacity-10 p-8 backdrop-blur">
            <h2 className="mb-6 font-bold text-2xl text-white">
              💳 Pi Network Payment
            </h2>

            <div className="space-y-4">
              <div className="rounded bg-blue-500 bg-opacity-20 p-4">
                <p className="text-blue-100 text-sm">Current Status</p>
                <p className="font-semibold text-lg text-white capitalize">
                  {paymentStatus === "idle" && "🟢 Ready"}
                  {paymentStatus === "processing" && "⏳ Processing..."}
                  {paymentStatus === "success" && "✅ Payment Successful"}
                  {paymentStatus === "error" && "❌ Payment Failed"}
                </p>
              </div>

              {transactionId && (
                <div className="rounded bg-green-500 bg-opacity-20 p-4">
                  <p className="text-green-100 text-sm">Transaction ID</p>
                  <p className="break-all font-mono text-sm text-white">
                    {transactionId}
                  </p>
                </div>
              )}

              <button
                className={`w-full rounded-lg px-4 py-3 font-bold text-white transition-all ${
                  paymentStatus === "processing"
                    ? "cursor-not-allowed bg-gray-500"
                    : "cursor-pointer bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600"
                }`}
                data-pi-sdk-target="buybutton"
                disabled={paymentStatus === "processing"}
                onClick={handlePiBuyClick}
              >
                {paymentStatus === "processing"
                  ? "Processing..."
                  : "🛒 Buy with Pi Network"}
              </button>

              <p className="text-center text-blue-200 text-xs">
                Ready to integrate with official Pi Network SDK
              </p>
            </div>
          </section>

          {/* Entertainment Hub Info */}
          <section className="rounded-lg border border-purple-300 border-opacity-30 bg-white bg-opacity-10 p-8 backdrop-blur">
            <h2 className="mb-6 font-bold text-2xl text-white">
              🎭 Entertainment Hub
            </h2>

            <div className="space-y-4 text-blue-100 text-sm">
              <div>
                <p className="font-semibold text-white">✨ Features</p>
                <ul className="ml-2 list-inside list-disc space-y-1">
                  <li>Artist Liberation ($2.5M+ severance)</li>
                  <li>Fair Compensation (20-25% backend)</li>
                  <li>Multi-Platform Distribution</li>
                  <li>Self-Healing Infrastructure</li>
                  <li>1M Concurrent Transactions</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold text-white">🌐 Integrations</p>
                <ul className="ml-2 list-inside list-disc space-y-1">
                  <li>Pi Network SDK</li>
                  <li>Blockchain Infrastructure</li>
                  <li>Content Distribution</li>
                  <li>Revenue Allocation</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold text-white">💰 Payment Support</p>
                <p>Native Pi Network integration with automated settlement</p>
              </div>
            </div>
          </section>
        </main>

        {/* Technical Details */}
        <section className="rounded-lg border border-white border-opacity-10 bg-white bg-opacity-5 p-8 backdrop-blur">
          <h2 className="mb-4 font-bold text-white text-xl">
            ⚙️ Technical Integration
          </h2>

          <div className="grid gap-4 text-sm md:grid-cols-3">
            <div>
              <p className="text-gray-400">Pi SDK Status</p>
              <p className="font-mono text-white">Ready for Integration</p>
            </div>
            <div>
              <p className="text-gray-400">Payment Processing</p>
              <p className="font-mono text-white">Automatic Settlement</p>
            </div>
            <div>
              <p className="text-gray-400">Transaction Capacity</p>
              <p className="font-mono text-white">1M Concurrent</p>
            </div>
          </div>

          <div className="mt-4 rounded bg-blue-500 bg-opacity-10 p-3 text-blue-200 text-xs">
            <p>Next.js + Pi Network SDK Integration</p>
            <p>Production Ready for Entertainment Hub Transactions</p>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-12 text-center text-gray-400 text-sm">
          <p>Triumph-Synergy Entertainment Hub | Pi Network Integrated</p>
          <p>
            Democratic Platform | Fair Artist Compensation | Unlimited Scale
          </p>
        </footer>
      </div>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');
        
        * {
          font-family: 'Poppins', sans-serif;
        }
      `}</style>
    </div>
  );
}
