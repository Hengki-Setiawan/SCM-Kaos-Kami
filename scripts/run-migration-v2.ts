import { createClient } from '@libsql/client';
import { sql } from 'drizzle-orm';

const client = createClient({
  url: "libsql://scm-kaos-kami-hengki-setiawan.aws-ap-northeast-1.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzM5NTQzMjgsImlkIjoiMDE5ZDA3ZTktNjQwMS03M2U1LThkMmUtNDM3N2RhNWJhYjA0IiwicmlkIjoiYWRhYmY5NjgtOGNkZC00NGJlLTk3MzgtZjc1NjQ1YTgzMmJhIn0.d2YgfEjNp_CE9nm-eaO_DbcQ-hQzuuISebB6APEWyUaYXFWRyt7qz8zM-cv3GqaikTmT2VhWKMIDw1D1OM3HCA",
});

async function main() {
  console.log("Starting manual migration...");
  try {
    console.log("Creating expenses table...");
    await client.execute(`
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        notes TEXT,
        receipt_url TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log("Creating suppliers table...");
    await client.execute(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        contact_person TEXT,
        phone TEXT,
        address TEXT,
        notes TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log("Migration finished successfully!");
  } catch (err) {
    console.error("MIGRATION_ERROR:", err);
    process.exit(1);
  } finally {
    // Note: libsql client.close() doesn't exist on all versions, or might be different.
    // In @libsql/client it might be client.close()
  }
}

main();
