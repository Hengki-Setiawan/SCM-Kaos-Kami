import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './src/db/schema';
import { eq } from 'drizzle-orm';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const db = drizzle(client, { schema });

async function run() {
  try {
    const allCats = await db.select().from(schema.categories);
    const bajuJadiCat = allCats.find(c => c.slug === 'baju-jadi');
    
    if (!bajuJadiCat) {
        console.log("Category 'baju-jadi' not found.");
        return;
    }

    console.log(`Found Category: ${bajuJadiCat.name} (${bajuJadiCat.id})`);

    const prods = await db.select().from(schema.products).where(eq(schema.products.categoryId, bajuJadiCat.id));
    console.log(`=== Products in Baju Jadi (${prods.length}) ===`);
    prods.forEach(p => {
        console.log(`- [${p.sku}] ${p.name} | Stock: ${p.currentStock}`);
    });

  } catch (e) {
    console.error("Error:", e);
  }
}

run();
