import { db } from './src/db';
import { products } from './src/db/schema';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const allProds = await db.select().from(products);
  console.log('Total Products in DB:', allProds.length);

  const testKeyword = "kaos polyester";
  const keywords = testKeyword.trim().split(/\s+/);
  
  const matchedProducts = allProds.filter(p => {
      const nameLower = (p.name || '').toLowerCase();
      const skuLower = (p.sku || '').toLowerCase();
      return keywords.every(k => nameLower.includes(k)) || keywords.every(k => skuLower.includes(k));
  });

  console.log(`Matched Products using "${testKeyword}":`, matchedProducts.length);
  if (matchedProducts.length > 0) {
     console.log('Sample matched:', matchedProducts[0].name);
  } else {
     console.log('NO MATCHES FOUND. Debugging all polyester products:');
     allProds.filter(p => (p.name || '').toLowerCase().includes('polyester')).forEach(p => {
         const nameLower = (p.name || '').toLowerCase();
         console.log(`Name: "${p.name}"`);
         console.log('nameLower:', nameLower);
         console.log('includes "kaos":', nameLower.includes('kaos'));
         console.log('includes "polyester":', nameLower.includes('polyester'));
     });
  }
  process.exit(0);
}

run().catch(e => { console.error('Error:', e); process.exit(1); });
