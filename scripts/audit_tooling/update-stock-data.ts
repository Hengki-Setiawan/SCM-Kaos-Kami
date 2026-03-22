import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { db } from './src/db';
import { products, categories } from './src/db/schema';
import { eq, like, and } from 'drizzle-orm';

async function run() {
  console.log("🚀 Starting Data Update & Refactor...");

  // 1. Get Categories
  const allCats = await db.select().from(categories);
  const getCatId = (slug: string) => allCats.find(c => c.slug === slug)?.id || '';
  
  const polosCatId = getCatId('baju-polos');
  const dtfCatId = getCatId('dtf-print');
  const jadiCatId = getCatId('baju-jadi');

  // 2. Refactor Baju Polos: Names, SKUs, and Thickness
  console.log("🧵 Refactoring Baju Polos...");
  const allPolos = await db.select().from(products).where(eq(products.categoryId, polosCatId));
  
  for (const p of allPolos) {
    let newName = p.name;
    let newSku = p.sku;
    let thickness = p.thickness || '';

    if (newName.includes('24s')) {
      thickness = '24s';
      newName = newName.replace('Cotton Combed 24s', 'Cotton Combed').trim();
      newSku = newSku.replace('-24s-', '-').replace('-24s', '');
    } else if (newName.includes('30s')) {
      thickness = '30s';
      newName = newName.replace('Cotton Combed 30s', 'Cotton Combed').trim();
      newSku = newSku.replace('-30s-', '-').replace('-30s', '');
    }

    // Set initial stock for Polos to 50
    await db.update(products)
      .set({ 
        name: newName, 
        sku: newSku.replace('--', '-'), // cleanup SKU if double dash
        thickness,
        currentStock: 50 
      })
      .where(eq(products.id, p.id));
    
    console.log(`✅ Updated: ${p.sku} -> ${newSku} | Stock: 50`);
  }

  // 3. Set DTF Stock to 30
  console.log("\n🎨 Updating DTF Print Stock...");
  await db.update(products)
    .set({ currentStock: 30 })
    .where(eq(products.categoryId, dtfCatId));
  console.log("✅ All DTF set to 30");

  // 4. Calculate Baju Jadi Stock
  console.log("\n👕 Calculating Baju Jadi Stock...");
  const allJadi = await db.select().from(products).where(eq(products.categoryId, jadiCatId));
  const updatedPolos = await db.select().from(products).where(eq(products.categoryId, polosCatId));
  const dtfStock = 30; // Constant as we just set it

  for (const j of allJadi) {
    // Logic: Kaos Skizo Hitam M depends on Kaos Polos Hitam M
    // Extract color and size from name
    const match = j.name.match(/(Hitam|Putih)\s+(S|M|L|XL|XXL|2XL|3XL|4XL|5XL)/i);
    if (match) {
      const color = match[1];
      const size = match[2];
      
      // Find matching polos (summing 24s and 30s if they both exist)
      const matchingPolos = updatedPolos.filter(p => 
        p.color?.toLowerCase() === color.toLowerCase() && 
        p.size?.toLowerCase() === size.toLowerCase()
      );
      
      const totalPolosStock = matchingPolos.reduce((sum, p) => sum + p.currentStock, 0);
      const possibleStock = Math.min(totalPolosStock, dtfStock);
      
      await db.update(products)
        .set({ currentStock: possibleStock })
        .where(eq(products.id, j.id));
      
      console.log(`✅ ${j.name}: ${possibleStock} (Components: ${totalPolosStock} Polos, ${dtfStock} DTF)`);
    }
  }

  console.log("\n🎉 Refactor and Stock Update Complete!");
  process.exit(0);
}

run().catch(err => {
  console.error("❌ Fatal Error:", err);
  process.exit(1);
});
