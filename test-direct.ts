import { executeStockActionDirectly } from './src/lib/ai-actions';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const intent = { action: 'ADD_STOCK', sku: 'DTF-KAMI-SKIZO-HITAM', qty: 2 };
  console.log("Testing direct execution...");
  const res = await executeStockActionDirectly(intent, 'telegram');
  console.log("RESULT:", res);
}
run();
