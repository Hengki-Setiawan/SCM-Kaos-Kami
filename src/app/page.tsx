import { db } from '@/db';
import { products, orders, stockMovements } from '@/db/schema';
import { sql, desc, eq } from 'drizzle-orm';
import DashboardClient from './DashboardClient';

export default async function Dashboard() {
  // Fetch high-level stats (Initial Data for SSR)
  const stats = await db.select({
    totalProducts: sql<number>`count(${products.id})`,
    totalStock: sql<number>`coalesce(sum(${products.currentStock}), 0)`,
    lowStockItems: sql<number>`count(case when ${products.currentStock} <= ${products.minStock} then 1 end)`,
    totalValue: sql<number>`coalesce(sum(${products.currentStock} * ${products.buyPrice}), 0)`
  }).from(products);

  const pendingOrders = await db.select({
    count: sql<number>`count(${orders.id})`
  }).from(orders).where(sql`${orders.status} = 'pending'`);

  const recentMovements = await db.select({
    id: stockMovements.id,
    type: stockMovements.type,
    quantity: stockMovements.quantity,
    reason: stockMovements.reason,
    createdBy: stockMovements.createdBy,
    createdAt: stockMovements.createdAt,
    productName: products.name
  })
  .from(stockMovements)
  .leftJoin(products, eq(stockMovements.productId, products.id))
  .orderBy(desc(stockMovements.createdAt))
  .limit(10);

  const lowStockList = await db.select({
    id: products.id,
    name: products.name,
    currentStock: products.currentStock,
    minStock: products.minStock
  }).from(products)
  .where(sql`${products.currentStock} <= ${products.minStock}`)
  .limit(8);

  const initialData = {
    stats: stats[0],
    pendingOrderCount: pendingOrders[0].count,
    recentMovements,
    lowStockList
  };

  return (
    <div className="flex flex-col gap-4">
      <DashboardClient initialData={initialData} />
    </div>
  );
}
