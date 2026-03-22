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
    console.log("=== Categories ===");
    cats.forEach(c => console.log(`- ${c.name} (${c.id}) slug: ${c.slug}`));

    const prods = await db.select().from(schema.products);
    console.log("\n=== Products (First 50) ===");
    prods.slice(0, 50).forEach(p => {
        console.log(`- [${p.sku}] ${p.name} | Cat: ${p.categoryId} | Thick: ${p.thickness} | Stock: ${p.currentStock}`);
    });

    console.log(`\nTotal products: ${prods.length}`);
    
    // Specifically search for baju polos, dtf, baju jadi
    const bajuPolos = prods.filter(p => p.name.toLowerCase().includes('polos'));
    const dtf = prods.filter(p => p.name.toLowerCase().includes('dtf'));
    const bajuJadi = prods.filter(p => p.name.toLowerCase().includes('jadi') || p.categoryId === 'baju-jadi'); // assuming baju-jadi is a category

    console.log(`\nBaju Polos count: ${bajuPolos.length}`);
    console.log(`DTF count: ${dtf.length}`);
    console.log(`Baju Jadi count: ${bajuJadi.length}`);

  } catch (e) {
    console.error("Error running dump-data:", e);
  }
}

run();
