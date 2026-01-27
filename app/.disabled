import Link from "next/link";
import PiPaymentButton from "@/components/PiPaymentButton";
import { auth } from "./(auth)/auth";

export default async function Page() {
  const session = await auth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-lg">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                π
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Triumph Synergy</h1>
                <p className="text-xs text-gray-300">Pi Network Payment Platform</p>
              </div>
            </div>
            <nav className="flex items-center gap-4">
              <Link 
                href="/ecosystem/applications" 
                className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 transition-colors"
              >
                Ecosystem
              </Link>
              <Link 
                href="/transactions" 
                className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 transition-colors"
              >
                Transactions
              </Link>
              {session ? (
                <Link 
                  href="/(chat)" 
                  className="rounded-lg bg-gradient-to-r from-yellow-400 to-orange-500 px-4 py-2 text-sm font-bold text-white shadow-lg hover:shadow-xl transition-all"
                >
                  AI Assistant
                </Link>
              ) : (
                <Link 
                  href="/login" 
                  className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 transition-colors"
                >
                  Sign In
                </Link>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="mb-8 inline-block">
            <div className="h-24 w-24 mx-auto rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-6xl font-bold text-white shadow-2xl animate-pulse">
              π
            </div>
          </div>
          
          <h1 className="text-5xl font-extrabold text-white sm:text-6xl lg:text-7xl mb-6">
            Triumph Synergy
          </h1>
          
          <p className="text-xl text-gray-200 mb-4 max-w-2xl mx-auto">
            Advanced Payment Routing Platform
          </p>
          
          <p className="text-lg text-gray-300 mb-12 max-w-3xl mx-auto">
            Powered by <span className="font-bold text-yellow-400">Pi Network</span> with 
            Stellar blockchain settlement, biometric authentication, and enterprise-grade compliance
          </p>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-5xl mx-auto">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-bold text-white mb-2">Instant Payments</h3>
              <p className="text-gray-300 text-sm">Fast and secure Pi Network transactions with real-time settlement</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="text-xl font-bold text-white mb-2">Secure & Compliant</h3>
              <p className="text-gray-300 text-sm">Enterprise-grade security with full regulatory compliance</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <div className="text-4xl mb-4">🌐</div>
              <h3 className="text-xl font-bold text-white mb-2">Global Ecosystem</h3>
              <p className="text-gray-300 text-sm">Connect with apps and services across the Pi Network</p>
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-6">Try Pi Payment</h2>
            <p className="text-gray-300 mb-6">Experience seamless cryptocurrency payments powered by Pi Network</p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <PiPaymentButton 
                amount={1} 
                memo="Test Payment - Triumph Synergy"
              />
              
              <Link 
                href="/ecosystem/applications" 
                className="inline-block rounded-lg bg-white/20 px-6 py-3 text-base font-semibold text-white hover:bg-white/30 transition-colors"
              >
                Explore Ecosystem →
              </Link>
            </div>
            
            <p className="text-xs text-gray-400 mt-6">
              * Payments require Pi Browser and Pi Network account
            </p>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <div className="bg-black/30 backdrop-blur-lg rounded-xl p-6 border border-white/10">
            <h3 className="text-xl font-bold text-white mb-4">🏢 For Businesses</h3>
            <ul className="space-y-2 text-gray-300">
              <li>• Accept Pi payments globally</li>
              <li>• Automated compliance & reporting</li>
              <li>• Multi-currency settlement options</li>
              <li>• Real-time transaction monitoring</li>
              <li>• Enterprise API integration</li>
            </ul>
          </div>
          
          <div className="bg-black/30 backdrop-blur-lg rounded-xl p-6 border border-white/10">
            <h3 className="text-xl font-bold text-white mb-4">👥 For Users</h3>
            <ul className="space-y-2 text-gray-300">
              <li>• Fast & secure Pi transactions</li>
              <li>• Low transaction fees</li>
              <li>• Biometric authentication</li>
              <li>• Transaction history tracking</li>
              <li>• 24/7 customer support</li>
            </ul>
          </div>
        </div>

        {/* Debug Link */}
        <div className="mt-12 text-center">
          <Link 
            href="/debug/pi-test" 
            className="inline-block text-sm text-gray-400 hover:text-gray-300 underline"
          >
            Pi Browser Debug Page
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black/20 backdrop-blur-lg mt-16">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-gray-400">
              © 2026 Triumph Synergy LLC. All rights reserved.
            </div>
            <div className="flex gap-6">
              <Link href="/legal/terms" className="text-sm text-gray-400 hover:text-gray-300">Terms</Link>
              <Link href="/legal/privacy" className="text-sm text-gray-400 hover:text-gray-300">Privacy</Link>
              <Link href="/debug/pi-test" className="text-sm text-gray-400 hover:text-gray-300">Support</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
