import { db } from '@/db';
import { stockMovements, products } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import Link from 'next/link';

export default async function HistoryPage() {
  const movements = await db.select({
    id: stockMovements.id,
    type: stockMovements.type,
    quantity: stockMovements.quantity,
    reason: stockMovements.reason,
    notes: stockMovements.notes,
    createdBy: stockMovements.createdBy,
    createdAt: stockMovements.createdAt,
    productName: products.name,
    productId: stockMovements.productId
  })
  .from(stockMovements)
  .leftJoin(products, eq(stockMovements.productId, products.id))
  .orderBy(desc(stockMovements.createdAt))
  .limit(100);

  const typeLabel = (type: string) => {
    if (type === 'IN') return { icon: '📥', text: 'Stok Masuk', color: 'rgb(var(--success))' };
    if (type === 'OUT') return { icon: '📤', text: 'Stok Keluar', color: 'rgb(var(--danger))' };
    if (type === 'ADJUSTMENT_IN') return { icon: '🔼', text: 'Koreksi +', color: 'rgb(var(--success))' };
    if (type === 'ADJUSTMENT_OUT') return { icon: '🔽', text: 'Koreksi -', color: 'rgb(var(--danger))' };
    return { icon: '🔄', text: type, color: 'rgb(var(--foreground))' };
  };

  return (
    <div className="flex flex-col gap-4 max-w-5xl mx-auto w-full">
      <div className="flex justify-between items-center">
        <div>
          <h1>📜 Riwayat Pergerakan Stok</h1>
          <p className="text-muted">Log semua aktivitas masuk, keluar, dan koreksi stok.</p>
        </div>
        <Link href="/" className="btn btn-outline">← Dashboard</Link>
      </div>

      <div className="glass-card overflow-x-auto">
        <table className="table-auto w-full text-sm">
          <thead>
            <tr className="text-left border-b border-[rgba(var(--border),0.5)]">
              <th className="p-3">Waktu</th>
              <th className="p-3">Tipe</th>
              <th className="p-3">Produk</th>
              <th className="p-3">Jumlah</th>
              <th className="p-3">Alasan</th>
              <th className="p-3">Sumber</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((m) => {
              const t = typeLabel(m.type);
              return (
                <tr key={m.id} className="border-b border-[rgba(var(--border),0.2)] hover:bg-[rgba(var(--surface-hover),0.3)] transition-colors">
                  <td className="p-3 text-muted text-xs whitespace-nowrap">{m.createdAt || '-'}</td>
                  <td className="p-3">
                    <span className="flex items-center gap-1" style={{ color: t.color }}>
                      {t.icon} {t.text}
                    </span>
                  </td>
                  <td className="p-3">
                    {m.productId ? (
                      <Link href={`/stock/${m.productId}`} style={{ color: 'rgb(var(--primary))' }}>{m.productName || '-'}</Link>
                    ) : (
                      <span>{m.productName || '-'}</span>
                    )}
                  </td>
                  <td className="p-3 font-bold" style={{ color: t.color }}>
                    {(m.type === 'IN' || m.type === 'ADJUSTMENT_IN') ? '+' : '-'}{m.quantity}
                  </td>
                  <td className="p-3 text-muted">{m.reason}</td>
                  <td className="p-3">
                    <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(var(--primary),0.1)' }}>
                      {m.createdBy || 'web'}
                    </span>
                  </td>
                </tr>
              );
            })}
            {movements.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-muted">Belum ada riwayat pergerakan stok.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
