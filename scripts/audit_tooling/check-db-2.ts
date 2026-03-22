import { db } from './src/db';
import { products } from './src/db/schema';
import { gt } from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  try {
    const prods = await db.select().from(products).where(gt(products.currentStock, 0));
    console.log("=== Products with Stock > 0 ===");
    console.log(prods.map(p => `${p.name} (SKU: ${p.sku}, CatID: ${p.categoryId}, Stock: ${p.currentStock})`));
  } catch (e) {
    console.error(e);
  }
}
run();
