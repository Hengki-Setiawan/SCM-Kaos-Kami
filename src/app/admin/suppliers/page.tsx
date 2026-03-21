import { db } from '@/db';
import { suppliers, expenses } from '@/db/schema';
import { desc, sql, eq } from 'drizzle-orm';
import SupplierClient from './SupplierClient';

export default async function SuppliersPage() {
  const allSuppliers = await db.select().from(suppliers).orderBy(desc(suppliers.createdAt));
  
  // Aggregate stats: total spend per supplier
  const stats = await db.select({
    supplierId: expenses.supplierId,
    totalSpend: sql<number>`sum(${expenses.amount})`,
    count: sql<number>`count(${expenses.id})`
  }).from(expenses).groupBy(expenses.supplierId);

  const formattedSuppliers = allSuppliers.map(s => {
    const stat = stats.find(st => st.supplierId === s.id);
    return {
      ...s,
      totalTransactions: stat?.count || 0,
      totalSpend: stat?.totalSpend || 0
    };
  });

  return (
    <div className="container mx-auto">
      <SupplierClient initialSuppliers={formattedSuppliers} />
    </div>
  );
}
