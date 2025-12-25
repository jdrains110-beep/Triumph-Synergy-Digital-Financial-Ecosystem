import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

config({ path: ".env.local" });

async function runMigrate() {
  const url = process.env.POSTGRES_URL;
  if (!url) {
    console.error("POSTGRES_URL is not defined. Set it in .env.local or environment.");
    process.exit(1);
  }

  const sql = postgres(url, { max: 1 });
  const db = drizzle(sql);

  console.log("⏳ Running migrations...");
  const start = Date.now();

  try {
    await migrate(db, { migrationsFolder: "./lib/db/migrations" });
    console.log("✅ Migrations completed in", Date.now() - start, "ms");
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed", err);
    process.exit(1);
  }
}

runMigrate();
