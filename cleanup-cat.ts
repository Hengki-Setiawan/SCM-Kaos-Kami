import { db } from './src/db';
import { categories } from './src/db/schema';
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const garbageId = '2550aac9-f54a-48b8-912d-f3ccfa7bb17c';
  console.log("Deleting garbage category 'skizo DTF Kami Skizo'...");
  await db.delete(categories).where(eq(categories.id, garbageId));
  console.log("Done! Verifying...");
  const remaining = await db.select().from(categories);
  console.log("Remaining categories:", remaining.map(c => `${c.icon} ${c.name}`));
}
run();
