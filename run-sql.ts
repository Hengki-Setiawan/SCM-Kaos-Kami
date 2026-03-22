import { db } from './src/db';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  try {
    console.log("Creating telegram_sessions table...");
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS telegram_sessions (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);
    console.log("Table telegram_sessions created successfully!");
  } catch (e) {
    console.error("Error creating table:", e);
  }
}
run();
