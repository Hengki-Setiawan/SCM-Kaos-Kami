import { db } from './src/db';
import { products, categories, telegramSessions } from './src/db/schema';
import { desc } from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  try {
    const prods = await db.select().from(products).orderBy(desc(products.createdAt)).limit(5);
    console.log("=== Recent Products ===");
    console.log(prods.map(p => `${p.name} (SKU: ${p.sku}, CatID: ${p.categoryId}, Stock: ${p.currentStock})`));
    
    const cats = await db.select().from(categories);
    console.log("\n=== Categories ===");
    console.log(cats.map(c => `${c.name} (ID: ${c.id}, slug: ${c.slug})`));

    const sessions = await db.select().from(telegramSessions);
    console.log("\n=== Sessions ===");
    console.log(sessions.map(s => `${s.id}: ${typeof s.data === 'string' ? s.data.substring(0, 100) : '...'}...`));

  } catch (e) {
    console.error(e);
  }
}
run();
