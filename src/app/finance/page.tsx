import ExpenseForm from './ExpenseForm';
import ExpenseList from './ExpenseList';
import { getExpenses } from '../actions/expenses';
import { db } from '@/db';
import { suppliers } from '@/db/schema';
import { eq } from 'drizzle-orm';

export default async function FinancePage() {
  const expenses = await getExpenses();
  const allSuppliers = await db.select().from(suppliers).where(eq(suppliers.isActive, true));

  return (
    <div className="flex flex-col gap-6" style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
      <div className="flex justify-between items-center mobile-col mobile-gap-2">
        <div>
          <h1>Manajemen Keuangan</h1>
          <p className="text-muted text-sm">Monitor seluruh pengeluaran operasional bisnis Anda.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <ExpenseForm suppliers={allSuppliers} />
        </div>
        <div className="lg:col-span-2">
          <ExpenseList expenses={expenses} />
        </div>
      </div>
    </div>
  );
}
