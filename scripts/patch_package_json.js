#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");

const cwd = process.cwd();
const pkgPath = path.join(cwd, "package.json");
if (!fs.existsSync(pkgPath)) {
	console.error("package.json not found in", cwd);
	process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
pkg.devDependencies = pkg.devDependencies || {};

// Add baseline-browser-mapping and cross-env
pkg.devDependencies["baseline-browser-mapping"] = "latest";
pkg.devDependencies["cross-env"] = "latest";

// Update test script to be cross-platform
pkg.scripts = pkg.scripts || {};
const newTest = "cross-env PLAYWRIGHT=True pnpm exec playwright test";
if (pkg.scripts.test !== newTest) {
	pkg.scripts.test = newTest;
}

fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
console.log(
	"Updated package.json — added devDependencies and updated test script.",
);

// Install the added dev dependencies
try {
	console.log(
		"Running pnpm add -D baseline-browser-mapping@latest cross-env@latest ...",
	);
	cp.execSync("pnpm add -D baseline-browser-mapping@latest cross-env@latest", {
		stdio: "inherit",
	});
	console.log("Dependencies installed.");
} catch (_err) {
	console.error("Failed to install dependencies. Run the following manually:");
	console.error("pnpm add -D baseline-browser-mapping@latest cross-env@latest");
	process.exit(1);
}

console.log(
	"Done. You can now run `pnpm test` using PowerShell (it will use cross-env).",
);
