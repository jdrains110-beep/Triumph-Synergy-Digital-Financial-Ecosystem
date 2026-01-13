/**
 * Test Setup File
 * Global setup for Vitest tests
 */

import "@testing-library/jest-dom";

// Mock environment variables for tests
process.env.NODE_ENV = "test";
process.env.PI_API_KEY = "test-pi-api-key";
process.env.PI_INTERNAL_API_KEY = "test-pi-internal-api-key";
process.env.STELLAR_HORIZON_URL = "https://horizon-testnet.stellar.org";
process.env.STELLAR_PAYMENT_ACCOUNT = "GTEST...";
process.env.STELLAR_PAYMENT_SECRET = "STEST...";
process.env.INTERNAL_PI_MULTIPLIER = "1.5";
process.env.INTERNAL_PI_MIN_VALUE = "10.0";
process.env.EXTERNAL_PI_MIN_VALUE = "1.0";

// Global test utilities
global.fetch = global.fetch || (async () => new Response());

// Clean up after each test
afterEach(() => {
	// Clear any mocks
});

// Global error handler for unhandled promises
process.on("unhandledRejection", (reason) => {
	console.error("Unhandled Promise Rejection:", reason);
});
