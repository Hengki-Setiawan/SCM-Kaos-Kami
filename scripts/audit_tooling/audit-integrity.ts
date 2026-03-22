import { db } from './src/db';
import { products, categories } from './src/db/schema';
import { eq, isNull } from 'drizzle-orm';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkIntegrity() {
  console.log("🔍 Running Database Integrity Check...");

  // 1. Check for products with null categoryId
  const orphanedProducts = await db.select().from(products).where(isNull(products.categoryId));
  if (orphanedProducts.length > 0) {
    console.error(`❌ Found ${orphanedProducts.length} products with NULL categoryId!`);
  } else {
    console.log("✅ No products with NULL categoryId.");
  }

  // 2. Check for products with non-existent categoryId
  const allProducts = await db.select().from(products);
  const allCategories = await db.select().from(categories);
  const categoryIds = new Set(allCategories.map(c => c.id));

  const invalidCatProducts = allProducts.filter(p => !categoryIds.has(p.categoryId));
  if (invalidCatProducts.length > 0) {
    console.error(`❌ Found ${invalidCatProducts.length} products with invalid categoryId!`);
    invalidCatProducts.forEach(p => console.log(`   - Product: ${p.name} (Cat ID: ${p.categoryId})`));
  } else {
    console.log("✅ All products have valid categoryId associations.");
  }

  // 3. Check for empty categories (optional, but good to know)
  const emptyCats = allCategories.filter(c => !allProducts.some(p => p.categoryId === c.id));
  if (emptyCats.length > 0) {
    console.log(`ℹ️ Note: ${emptyCats.length} categories are currently empty.`);
    // emptyCats.forEach(c => console.log(`   - ${c.name}`));
  }

  console.log("🎉 Integrity Check Completed.");
  process.exit(0);
}

checkIntegrity().catch(err => {
  console.error("❌ Fatal Error:", err);
  process.exit(1);
});
