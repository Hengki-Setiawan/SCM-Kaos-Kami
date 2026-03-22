import { db } from './src/db';
import { categories, products } from './src/db/schema';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const cats = await db.select().from(categories);
  console.log("=== ALL CATEGORIES ===");
  for (const c of cats) {
    const prods = await db.select().from(products).where(require('drizzle-orm').eq(products.categoryId, c.id));
    console.log(`${c.icon || '📁'} ${c.name} (slug: ${c.slug}, ID: ${c.id}) → ${prods.length} produk`);
  }
  
  const allProds = await db.select().from(products);
  console.log(`\n=== TOTAL PRODUK: ${allProds.length} ===`);
  
  // Check for orphan products (no valid category)
  const catIds = cats.map(c => c.id);
  const orphans = allProds.filter(p => !catIds.includes(p.categoryId));
  if (orphans.length > 0) {
    console.log("\n⚠️ PRODUK TANPA KATEGORI VALID:");
    orphans.forEach(p => console.log(`  - ${p.name} (CatID: ${p.categoryId})`));
  }
}
run();
