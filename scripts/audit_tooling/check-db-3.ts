import { db } from './src/db';
import { products } from './src/db/schema';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const allProds = await db.select().from(products);
  const found = allProds.find(x => 
    x.sku?.toLowerCase().includes('skizo') || 
    x.name?.toLowerCase().includes('skizo')
  );
  console.log("Found:", found ? `${found.name} (${found.sku})` : "Not found");
  
  const exact = allProds.filter(x => x.sku?.includes('DTF-KAMI-SKIZO'));
  console.log("Exact matches:", exact.map(x => x.sku));
}
run();
