import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import PiPaymentButton to avoid SSR issues
// const PiPaymentButton = dynamic(() => import('../../components/PiPaymentButton'), {
//   ssr: false,
//   loading: () => <div>Loading payment button...</div>
// });

// This page requires client-side rendering only
export const dynamic_config = 'force-dynamic';

export default function PiVerification() {
  const [verificationResults, setVerificationResults] = useState<any>({});
  const [isPiBrowser, setIsPiBrowser] = useState(false);
  const [piAuth, setPiAuth] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    // Run verification checks
    const runVerification = async () => {
      const results: any = {};

      // Check Pi SDK
      results.piSdkLoaded = typeof window !== 'undefined' && typeof (window as any).Pi !== 'undefined';
      results.piInitAvailable = results.piSdkLoaded && typeof (window as any).Pi.init === 'function';
      results.piAuthAvailable = results.piSdkLoaded && typeof (window as any).Pi.authenticate === 'function';
      results.piPaymentAvailable = results.piSdkLoaded && typeof (window as any).Pi.createPayment === 'function';

      // Check environment
      results.envAppId = !!process.env.NEXT_PUBLIC_PI_APP_ID;
      results.envApiKey = !!process.env.PI_API_KEY;
      results.envSandbox = !!process.env.NEXT_PUBLIC_PI_SANDBOX;

      // Check browser - only access navigator on client side
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'server';
      results.userAgent = userAgent;
      results.isPiBrowser = typeof navigator !== 'undefined' && (
                           userAgent.includes('PiBrowser') ||
                           userAgent.includes('Pi Network') ||
                           results.piSdkLoaded);
      setIsPiBrowser(results.isPiBrowser);

      // Check API routes
      const apiChecks = await Promise.all([
        checkApiRoute('/api/pi/approve'),
        checkApiRoute('/api/pi/complete'),
        checkApiRoute('/api/pi_payment/approve'),
        checkApiRoute('/api/pi_payment/complete')
      ]);
      results.apiRoutes = {
        approve: apiChecks[0],
        complete: apiChecks[1],
        paymentApprove: apiChecks[2],
        paymentComplete: apiChecks[3]
      };

      // Test Pi authentication if in Pi Browser
      if (results.isPiBrowser && results.piAuthAvailable) {
        try {
          (window as any).Pi.authenticate(['username', 'payments'], (auth: any) => {
            console.log('Pi Auth Success:', auth);
            setPiAuth(auth);
            results.authentication = { success: true, data: auth };
          }, (error: any) => {
            console.log('Pi Auth Error:', error);
            results.authentication = { success: false, error };
          });
        } catch (error) {
          results.authentication = { success: false, error: error instanceof Error ? error.message : String(error) };
        }
      }

      setVerificationResults(results);
    };

    const checkApiRoute = async (route: string) => {
      try {
        const response = await fetch(route, { method: 'HEAD' });
        return response.ok;
      } catch {
        return false;
      }
    };

    runVerification();
  }, []);

  const handlePaymentTest = (amount: number, type: string) => {
    console.log(`Testing ${type} payment: ${amount} Pi`);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold mb-6 text-center text-blue-600">
        🔍 Pi Network Integration Verification
      </h1>

      {/* Status Overview */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h2 className="text-xl font-semibold mb-4 text-blue-800">📊 Integration Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className={verificationResults.piSdkLoaded ? 'text-green-600' : 'text-red-600'}>
                {verificationResults.piSdkLoaded ? '✅' : '❌'}
              </span>
              <span>Pi SDK v2.0 Loaded</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={verificationResults.piInitAvailable ? 'text-green-600' : 'text-red-600'}>
                {verificationResults.piInitAvailable ? '✅' : '❌'}
              </span>
              <span>Pi.init() Available</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={verificationResults.piAuthAvailable ? 'text-green-600' : 'text-red-600'}>
                {verificationResults.piAuthAvailable ? '✅' : '❌'}
              </span>
              <span>Pi.authenticate() Available</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={verificationResults.piPaymentAvailable ? 'text-green-600' : 'text-red-600'}>
                {verificationResults.piPaymentAvailable ? '✅' : '❌'}
              </span>
              <span>Pi.createPayment() Available</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className={verificationResults.envAppId ? 'text-green-600' : 'text-red-600'}>
                {verificationResults.envAppId ? '✅' : '❌'}
              </span>
              <span>PI_APP_ID Configured</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={verificationResults.envApiKey ? 'text-green-600' : 'text-red-600'}>
                {verificationResults.envApiKey ? '✅' : '❌'}
              </span>
              <span>PI_API_KEY Configured</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={verificationResults.isPiBrowser ? 'text-green-600' : 'text-red-600'}>
                {verificationResults.isPiBrowser ? '✅' : '❌'}
              </span>
              <span>Pi Browser Detected</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={piAuth ? 'text-green-600' : 'text-orange-600'}>
                {piAuth ? '✅' : '⏳'}
              </span>
              <span>Pi Authentication</span>
            </div>
          </div>
        </div>
      </div>

      {/* API Routes Status */}
      <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
        <h2 className="text-xl font-semibold mb-4 text-green-800">🔗 API Routes Status</h2>
        <div className="grid grid-cols-2 gap-4">
          {verificationResults.apiRoutes && Object.entries(verificationResults.apiRoutes).map(([route, status]: [string, any]) => (
            <div key={route} className="flex items-center space-x-2">
              <span className={status ? 'text-green-600' : 'text-red-600'}>
                {status ? '✅' : '❌'}
              </span>
              <span className="text-sm">/api/pi/{route.replace('payment', 'payment/')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Testing */}
      <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
        <h2 className="text-xl font-semibold mb-4 text-purple-800">💰 Payment Testing</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* <PiPaymentButton
            amount={0.01}
            memo="Pi Integration Test - Micro Transaction"
            onPaymentSuccess={(paymentId: string) => console.log('Test payment success:', paymentId)}
            onPaymentError={(error: any) => console.error('Test payment error:', error)}
            metadata={{
              productId: 'pi-verification-test',
              description: 'Testing Pi Network integration',
              type: 'verification'
            }}
          />

          <PiPaymentButton
            amount={1}
            memo="Pi Integration Test - Standard Transaction"
            onPaymentSuccess={(paymentId: string) => console.log('Standard payment success:', paymentId)}
            onPaymentError={(error: any) => console.error('Standard payment error:', error)}
            metadata={{
              productId: 'pi-verification-standard',
              description: 'Standard Pi payment verification',
              type: 'verification'
            }}
          /> */}
          <div>Payment buttons temporarily disabled for build testing</div>
        </div>
      </div>

      {/* Browser Info */}
      <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">🌐 Browser Information</h2>
        <div className="text-sm space-y-2">
          <p><strong>User Agent:</strong> {verificationResults.userAgent}</p>
          <p><strong>Pi Browser:</strong> {verificationResults.isPiBrowser ? 'Yes' : 'No'}</p>
          <p><strong>Online:</strong> {navigator.onLine ? 'Yes' : 'No'}</p>
        </div>
      </div>

      {/* Authentication Status */}
      {piAuth && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-green-800">🔐 Pi Authentication Success</h2>
          <pre className="text-xs bg-white p-2 rounded border overflow-auto">
            {JSON.stringify(piAuth, null, 2)}
          </pre>
        </div>
      )}

      {/* Instructions */}
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h2 className="text-xl font-semibold mb-4 text-yellow-800">📋 Testing Instructions</h2>
        <ol className="text-sm text-yellow-700 space-y-2 list-decimal list-inside">
          <li>Ensure all status checks above are green (✅)</li>
          <li>Open this page in the Pi Browser app on mobile</li>
          <li>Verify Pi authentication completes successfully</li>
          <li>Click a payment button to test the full transaction flow</li>
          <li>Approve the payment in your Pi wallet</li>
          <li>Check browser console for detailed transaction logs</li>
          <li>Verify transaction appears in your transaction history</li>
        </ol>
      </div>

      {/* Raw Verification Data */}
      <details className="mt-6">
        <summary className="cursor-pointer text-sm text-gray-600">🔧 Raw Verification Data</summary>
        <pre className="text-xs bg-gray-100 p-4 rounded mt-2 overflow-auto">
          {JSON.stringify(verificationResults, null, 2)}
        </pre>
      </details>
    </div>
  );
}

// Force server-side rendering to prevent static generation issues with navigator
export async function getServerSideProps() {
  return { props: {} };
}