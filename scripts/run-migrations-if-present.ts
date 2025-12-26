import { execSync } from "node:child_process";
import { config } from "dotenv";

config({ path: ".env.local" });

const runMigrations = process.env.RUN_MIGRATIONS === "true";

if (!runMigrations) {
  console.log(
    "RUN_MIGRATIONS != true — skipping migrations (set RUN_MIGRATIONS=true to run)."
  );
  process.exit(0);
}

if (runMigrations && !process.env.POSTGRES_URL) {
  console.error(
    "RUN_MIGRATIONS=true but POSTGRES_URL is not set — failing build."
  );
  process.exit(1);
}

try {
  execSync("npx tsx lib/db/migrate.ts", { stdio: "inherit" });
} catch (err) {
  console.error(err);
  process.exit(1);
}

