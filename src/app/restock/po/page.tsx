import { db } from '@/db';
import { products, categories } from '@/db/schema';
import { sql, eq } from 'drizzle-orm';
import PoPrintClient from './PoPrintClient';

export default async function PurchaseOrderPage() {
  // Fetch all items that are low in stock
  const lowStockItems = await db.select({
    id: products.id,
    sku: products.sku,
    name: products.name,
    color: products.color,
    size: products.size,
    currentStock: products.currentStock,
    minStock: products.minStock,
    categoryName: categories.name,
  })
  .from(products)
  .leftJoin(categories, eq(products.categoryId, categories.id))
  .where(sql`${products.currentStock} <= ${products.minStock}`);

  return (
    <div className="po-container" style={{ background: '#fff', minHeight: '100vh', color: '#000', padding: '2rem' }}>
      <PoPrintClient items={lowStockItems} />
    </div>
  );
}
