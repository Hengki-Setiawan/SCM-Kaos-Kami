import { db } from '@/db';
import { products, orders, stockMovements, alerts } from '@/db/schema';
import { sql, desc, eq } from 'drizzle-orm';
import Link from 'next/link';

export default async function Dashboard() {
  // Fetch high-level stats
  const stats = await db.select({
    totalProducts: sql<number>`count(${products.id})`,
    totalStock: sql<number>`coalesce(sum(${products.currentStock}), 0)`,
    lowStockItems: sql<number>`count(case when ${products.currentStock} <= ${products.minStock} then 1 end)`,
    totalValue: sql<number>`coalesce(sum(${products.currentStock} * ${products.buyPrice}), 0)`
  }).from(products);

  const pendingOrders = await db.select({
    count: sql<number>`count(${orders.id})`
  }).from(orders).where(sql`${orders.status} = 'pending'`);

  // Recent stock movements (last 10)
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

  // Low stock products list
  const lowStockList = await db.select({
    id: products.id,
    name: products.name,
    currentStock: products.currentStock,
    minStock: products.minStock
  }).from(products)
  .where(sql`${products.currentStock} <= ${products.minStock}`)
  .limit(8);

  const { totalProducts, totalStock, lowStockItems, totalValue } = stats[0];
  const pendingOrderCount = pendingOrders[0].count;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1>Dashboard Kaos Kami</h1>
          <p className="text-muted">Ringkasan stok dan performa hari ini.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/orders/new" className="btn btn-primary">+ Pesanan Baru</Link>
          <Link href="/orders/scan" className="btn btn-outline">📸 Scan Resi</Link>
          <Link href="/chat" className="btn btn-outline">🤖 Tanya AI</Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card flex flex-col gap-2">
          <span className="text-muted text-sm">Total Varian Produk</span>
          <span style={{ fontSize: '2rem', fontWeight: 700 }}>{totalProducts}</span>
        </div>
        <div className="glass-card flex flex-col gap-2">
          <span className="text-muted text-sm">Total Item di Gudang</span>
          <span style={{ fontSize: '2rem', fontWeight: 700 }}>{totalStock}</span>
        </div>
        <div className="glass-card flex flex-col gap-2" style={lowStockItems > 0 ? { borderLeft: '4px solid rgb(var(--warning))' } : {}}>
          <span className="text-muted text-sm">Stok Menipis / Habis</span>
          <span style={{ fontSize: '2rem', fontWeight: 700, color: lowStockItems > 0 ? 'rgb(var(--warning))' : 'inherit' }}>
            {lowStockItems}
          </span>
        </div>
        <div className="glass-card flex flex-col gap-2" style={pendingOrderCount > 0 ? { borderLeft: '4px solid rgb(var(--info))' } : {}}>
          <span className="text-muted text-sm">Pesanan Pending</span>
          <span style={{ fontSize: '2rem', fontWeight: 700, color: pendingOrderCount > 0 ? 'rgb(var(--info))' : 'inherit' }}>
            {pendingOrderCount}
          </span>
        </div>
      </div>

      {/* Estimated Asset Value */}
      <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(var(--primary),0.08), rgba(var(--accent),0.08))' }}>
        <span className="text-muted text-sm">💰 Estimasi Nilai Aset Gudang</span>
        <span style={{ fontSize: '1.8rem', fontWeight: 700, display: 'block', marginTop: '0.5rem' }}>
          Rp {new Intl.NumberFormat('id-ID').format(totalValue)}
        </span>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">

        {/* Aktivitas Terakhir (2 cols) */}
        <div className="glass-card md:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3>📜 Aktivitas Stok Terakhir</h3>
            <Link href="/history" style={{ color: 'rgb(var(--primary))', fontSize: '0.85rem' }}>Lihat Semua →</Link>
          </div>
          {recentMovements.length === 0 ? (
            <p className="text-muted text-sm">Belum ada aktivitas hari ini.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {recentMovements.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(var(--surface-hover), 0.3)' }}>
                  <span style={{ fontSize: '1.2rem' }}>
                    {m.type === 'IN' || m.type === 'ADJUSTMENT_IN' ? '📥' : m.type === 'OUT' || m.type === 'ADJUSTMENT_OUT' ? '📤' : '🔄'}
                  </span>
                  <div className="flex-1">
                    <span className="text-sm font-semibold">{m.productName || 'Produk'}</span>
                    <span className="text-xs text-muted block">{m.reason} • {m.createdBy || 'web'}</span>
                  </div>
                  <span className={`text-sm font-bold ${(m.type === 'IN' || m.type === 'ADJUSTMENT_IN') ? 'text-[rgb(var(--success))]' : 'text-[rgb(var(--danger))]'}`}>
                    {(m.type === 'IN' || m.type === 'ADJUSTMENT_IN') ? '+' : '-'}{m.quantity}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Right */}
        <div className="flex flex-col gap-4">
          {/* Low Stock Alert */}
          <div className="glass-card" style={lowStockItems > 0 ? { borderTop: '3px solid rgb(var(--danger))' } : {}}>
            <h3>⚠️ Peringatan Stok</h3>
            {lowStockList.length > 0 ? (
              <div className="flex flex-col gap-2 mt-3">
                {lowStockList.map((p) => (
                  <Link href={`/stock/${p.id}`} key={p.id} className="flex justify-between items-center p-2 rounded-lg text-sm" style={{ background: 'rgba(var(--danger), 0.08)' }}>
                    <span>{p.name}</span>
                    <span className="font-bold text-[rgb(var(--danger))]">{p.currentStock}/{p.minStock}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-muted mt-2 text-sm">Semua stok aman. ✅</p>
            )}
          </div>

          {/* Quick Actions */}
          <div className="glass-card">
            <h3 className="mb-3">⚡ Aksi Cepat</h3>
            <div className="flex flex-col gap-2">
              <Link href="/stock" className="btn btn-outline w-full text-sm">📦 Kelola Stok</Link>
              <Link href="/analysis" className="btn btn-outline w-full text-sm">📈 Analisis AI</Link>
              <Link href="/calculator" className="btn btn-outline w-full text-sm">🧮 Kalkulator Harga</Link>
              <Link href="/settings" className="btn btn-outline w-full text-sm">⚙️ Pengaturan</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
