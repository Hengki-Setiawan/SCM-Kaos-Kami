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
    
    console.log("=== Baju Polos Details ===");
    const bajuPolos = prods.filter(p => p.name.toLowerCase().includes('polos'));
    bajuPolos.forEach(p => {
        console.log(`- [${p.sku}] ${p.name} | Thick: ${p.thickness} | Stock: ${p.currentStock}`);
    });

    console.log("\n=== DTF Details ===");
    const dtf = prods.filter(p => p.name.toLowerCase().includes('dtf'));
    dtf.forEach(p => {
        console.log(`- [${p.sku}] ${p.name} | Stock: ${p.currentStock}`);
    });

    console.log("\n=== Baju Jadi Details ===");
    const bajuJadi = prods.filter(p => p.name.toLowerCase().includes('jadi') || p.categoryId === 'baju-jadi');
    bajuJadi.forEach(p => {
        console.log(`- [${p.sku}] ${p.name} | Stock: ${p.currentStock}`);
    });

  } catch (e) {
    console.error("Error:", e);
  }
}

run();
