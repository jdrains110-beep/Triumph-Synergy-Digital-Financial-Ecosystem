import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
	testDir: "tests",
	timeout: 30_000,
	expect: { timeout: 5000 },
	fullyParallel: true,
	reporter: [["list"]],
	use: {
		baseURL: "http://127.0.0.1:3000",
		trace: "on-first-retry",
	},
	webServer: {
		command: "pnpm run start-server-for-tests",
		port: 3000,
		reuseExistingServer: true,
		timeout: 120_000,
	},
	projects: [{ name: "chromium", use: devices["Desktop Chrome"] }],
});
