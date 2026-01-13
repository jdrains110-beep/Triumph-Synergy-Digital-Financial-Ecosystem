// Pi Network Integration Verification Script
// Run this in the browser console to verify Pi SDK integration

(function() {
  console.log('🔍 Pi Network Integration Verification Starting...');

  // Check 1: Pi SDK Loaded
  if (typeof window.Pi !== 'undefined') {
    console.log('✅ Pi SDK v2.0 loaded successfully');
    console.log('   Pi object:', window.Pi);
  } else {
    console.error('❌ Pi SDK not loaded');
    return;
  }

  // Check 2: Pi SDK Initialization
  if (window.Pi && typeof window.Pi.init === 'function') {
    console.log('✅ Pi.init() function available');
  } else {
    console.error('❌ Pi.init() function not available');
  }

  // Check 3: Pi Authentication
  if (window.Pi && typeof window.Pi.authenticate === 'function') {
    console.log('✅ Pi.authenticate() function available');
  } else {
    console.error('❌ Pi.authenticate() function not available');
  }

  // Check 4: Pi Payment Creation
  if (window.Pi && typeof window.Pi.createPayment === 'function') {
    console.log('✅ Pi.createPayment() function available');
  } else {
    console.error('❌ Pi.createPayment() function not available');
  }

  // Check 5: Environment Variables
  const piAppId = process.env.NEXT_PUBLIC_PI_APP_ID;
  const piApiKey = process.env.PI_API_KEY;
  const piSandbox = process.env.NEXT_PUBLIC_PI_SANDBOX;

  console.log('🔧 Environment Variables:');
  console.log('   PI_APP_ID:', piAppId ? '✅ Set' : '❌ Not set');
  console.log('   PI_API_KEY:', piApiKey ? '✅ Set' : '❌ Not set');
  console.log('   PI_SANDBOX:', piSandbox ? '✅ Set (' + piSandbox + ')' : '❌ Not set');

  // Check 6: Browser Detection
  const isPiBrowser = navigator.userAgent.includes('PiBrowser') ||
                      navigator.userAgent.includes('Pi Network') ||
                      window.Pi !== undefined;

  console.log('🌐 Browser Detection:');
  console.log('   User Agent:', navigator.userAgent.substring(0, 100) + '...');
  console.log('   Pi Browser Detected:', isPiBrowser ? '✅ Yes' : '❌ No');

  // Check 7: API Routes
  const apiRoutes = [
    '/api/pi/approve',
    '/api/pi/complete',
    '/api/pi_payment/approve',
    '/api/pi_payment/complete'
  ];

  console.log('🔗 API Routes Check:');
  apiRoutes.forEach(route => {
    fetch(route, { method: 'HEAD' })
      .then(response => {
        console.log(`   ${route}: ${response.ok ? '✅ Available' : '❌ Not available'}`);
      })
      .catch(error => {
        console.log(`   ${route}: ❌ Error - ${error.message}`);
      });
  });

  // Check 8: Component Loading
  console.log('⚛️ Component Check:');
  const piButton = document.querySelector('[data-pi-payment]');
  if (piButton) {
    console.log('✅ PiPaymentButton component found');
  } else {
    console.log('⚠️ PiPaymentButton component not found on current page');
  }

  // Check 9: Network Status
  if (navigator.onLine) {
    console.log('🌍 Network: ✅ Online');
  } else {
    console.log('🌍 Network: ❌ Offline');
  }

  // Check 10: Pi SDK Version
  if (window.Pi && window.Pi.version) {
    console.log('📦 Pi SDK Version:', window.Pi.version);
  } else {
    console.log('📦 Pi SDK Version: Unknown');
  }

  console.log('🎯 Verification Complete!');
  console.log('💡 Next Steps:');
  console.log('   1. Open this page in Pi Browser');
  console.log('   2. Click a payment button');
  console.log('   3. Approve payment in Pi wallet');
  console.log('   4. Verify transaction completion');

  // Test Pi Authentication (if in Pi Browser)
  if (isPiBrowser && window.Pi && typeof window.Pi.authenticate === 'function') {
    console.log('🔐 Testing Pi Authentication...');
    window.Pi.authenticate(['username', 'payments'], (auth) => {
      console.log('✅ Authentication successful:', auth);
    }, (error) => {
      console.log('❌ Authentication failed:', error);
    });
  }

})();