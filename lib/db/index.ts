/**
 * Database Connection & ORM Setup
 * Drizzle ORM PostgreSQL connection with lazy initialization
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Lazy-loaded database instance
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _client: ReturnType<typeof postgres> | null = null;

/**
 * Get database instance with lazy initialization
 * This prevents build-time errors when DATABASE_URL is not available
 */
function getDatabase() {
	if (_db) return _db;

	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) {
		// During build, return a mock that will fail at runtime if used
		console.warn(
			"DATABASE_URL not set - database operations will fail at runtime",
		);
		throw new Error("DATABASE_URL environment variable is required");
	}

	// Create postgres client
	_client = postgres(databaseUrl, {
		prepare: false, // Disable prepared statements for serverless
		connect_timeout: 10, // 10 second connection timeout
	});

	// Create Drizzle ORM instance with schema
	_db = drizzle(_client, { schema });
	return _db;
}

// Export a proxy that lazily initializes the database
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
	get(_, prop) {
		const database = getDatabase();
		const value = database[prop as keyof typeof database];
		if (typeof value === "function") {
			return value.bind(database);
		}
		return value;
	},
});

// Export types
export type Database = typeof db;
export { schema };
