/**
 * Database Connection & ORM Setup
 * Drizzle ORM PostgreSQL connection
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Get database URL from environment
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Create postgres client
const client = postgres(databaseUrl, {
  prepare: false, // Disable prepared statements for serverless
  connect_timeout: 10, // 10 second connection timeout
});

// Create Drizzle ORM instance with schema
export const db = drizzle(client, { schema });

// Export types
export type Database = typeof db;
export { schema };
