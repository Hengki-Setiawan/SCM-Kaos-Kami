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
    const prods = await db.select().from(schema.products);
    const cats = await db.select().from(schema.categories);
    
    const catMap = Object.fromEntries(cats.map(c => [c.id, c.slug]));

    console.log("=== Baju Polos (Filtered) ===");
    prods.filter(p => catMap[p.categoryId] === 'baju-polos').forEach(p => {
        console.log(`- [${p.sku}] ${p.name} | Stock: ${p.currentStock}`);
    });

    console.log("\n=== DTF Print ===");
    prods.filter(p => catMap[p.categoryId] === 'dtf-print').forEach(p => {
        console.log(`- [${p.sku}] ${p.name} | Stock: ${p.currentStock}`);
    });

    console.log("\n=== Baju Jadi ===");
    prods.filter(p => catMap[p.categoryId] === 'baju-jadi').forEach(p => {
        console.log(`- [${p.sku}] ${p.name} | Stock: ${p.currentStock}`);
    });

  } catch (e) {
    console.error("Error:", e);
  }
}

run();
