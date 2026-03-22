import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './src/db/schema';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const db = drizzle(client, { schema });

async function run() {
  try {
    const cats = await db.select().from(schema.categories);
    console.log("=== All Categories ===");
    cats.forEach(c => console.log(`- [${c.id}] ${c.name} | slug: ${c.slug}`));
  } catch (e) {
    console.error("Error:", e);
  }
}

run();
