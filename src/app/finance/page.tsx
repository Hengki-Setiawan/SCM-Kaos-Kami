'use client';

import { useState, useEffect } from 'react';
import ExpenseForm from './ExpenseForm';
import ExpenseList from './ExpenseList';
import { getExpenses } from '../actions/expenses';

export default function FinancePage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshData = async () => {
    setLoading(true);
    const data = await getExpenses();
    setExpenses(data);
    setLoading(false);
  };

  useEffect(() => {
    refreshData();
  }, []);

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
          <ExpenseForm onRefresh={refreshData} />
        </div>
        <div className="lg:col-span-2">
          {loading ? (
            <div className="glass-card flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[rgb(var(--primary))]"></div>
            </div>
          ) : (
            <ExpenseList expenses={expenses} onRefresh={refreshData} />
          )}
        </div>
      </div>
    </div>
  );
}
