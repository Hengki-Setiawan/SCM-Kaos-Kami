'use client';

import useSWR from 'swr';
import Link from 'next/link';

const fetcher = (url: string) => fetch(url).then(res => res.json()).then(res => res.data);

export default function DashboardClient({ initialData }: { initialData: any }) {
  const { data, error } = useSWR('/api/dashboard/stats', fetcher, {
    fallbackData: initialData,
    refreshInterval: 5000, // Poll every 5 seconds for real-time feel
    revalidateOnFocus: true,
  });

  const displayData = data || initialData;
  const { totalProducts, totalStock, lowStockItems, totalValue } = displayData.stats;
  const pendingOrderCount = displayData.pendingOrderCount;
  const recentMovements = displayData.recentMovements || [];
  const lowStockList = displayData.lowStockList || [];

  return (
    <>
      <div className="flex justify-between items-start mobile-col mobile-gap-2 mb-2">
        <div>
          <div className="flex items-center gap-2">
            <h1>Dashboard Kaos Kami</h1>
            {/* Live indicator dot */}
            <span className="flex h-3 w-3 relative mb-2" title="Live Sync Active">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[rgb(var(--success))] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[rgb(var(--success))]"></span>
            </span>
          </div>
          <p className="text-muted">Ringkasan stok dan performa hari ini.</p>
        </div>
        <div className="flex gap-2 mobile-col">
          <Link href="/orders/new" className="btn btn-primary touch-target">+ Pesanan Baru</Link>
          <div className="flex gap-2">
            <Link href="/orders/scan" className="btn btn-outline touch-target" style={{ flex: 1 }}>📸 Scan Resi</Link>
            <Link href="/chat" className="btn btn-outline touch-target" style={{ flex: 1 }}>🤖 Tanya AI</Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 mobile-grid-cols-2 gap-4">
        <div className="glass-card flex flex-col gap-2 transition-all">
          <span className="text-muted text-sm">Total Varian Produk</span>
          <span style={{ fontSize: '2rem', fontWeight: 700 }}>{totalProducts}</span>
        </div>
        <div className="glass-card flex flex-col gap-2 transition-all">
          <span className="text-muted text-sm">Total Item di Gudang</span>
          <span style={{ fontSize: '2rem', fontWeight: 700 }}>{totalStock}</span>
        </div>
        <div className="glass-card flex flex-col gap-2 transition-all" style={lowStockItems > 0 ? { borderLeft: '4px solid rgb(var(--warning))' } : {}}>
          <span className="text-muted text-sm">Stok Menipis / Habis</span>
          <span style={{ fontSize: '2rem', fontWeight: 700, color: lowStockItems > 0 ? 'rgb(var(--warning))' : 'inherit' }}>
            {lowStockItems}
          </span>
        </div>
        <div className="glass-card flex flex-col gap-2 transition-all" style={pendingOrderCount > 0 ? { borderLeft: '4px solid rgb(var(--info))' } : {}}>
          <span className="text-muted text-sm">Pesanan Pending</span>
          <span style={{ fontSize: '2rem', fontWeight: 700, color: pendingOrderCount > 0 ? 'rgb(var(--info))' : 'inherit' }}>
            {pendingOrderCount}
          </span>
        </div>
      </div>

      {/* Estimated Asset Value */}
      <div className="glass-card transition-all" style={{ background: 'linear-gradient(135deg, rgba(var(--primary),0.08), rgba(var(--accent),0.08))' }}>
        <span className="text-muted text-sm">💰 Estimasi Nilai Aset Gudang</span>
        <span style={{ fontSize: '1.8rem', fontWeight: 700, display: 'block', marginTop: '0.5rem' }}>
          Rp {new Intl.NumberFormat('id-ID').format(totalValue)}
        </span>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-3 gap-4 mt-2">

        {/* Aktivitas Terakhir (2 cols) */}
        <div className="glass-card" style={{ gridColumn: 'span 2' }}>
          <div className="flex justify-between items-center mb-4">
            <h3>📜 Aktivitas Stok Terakhir</h3>
            <Link href="/history" style={{ color: 'rgb(var(--primary))', fontSize: '0.85rem' }}>Lihat Semua →</Link>
          </div>
          {recentMovements.length === 0 ? (
            <p className="text-muted text-sm">Belum ada aktivitas hari ini.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {recentMovements.map((m: any) => (
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
          <div className="glass-card flex flex-col items-start gap-3 transition-all" style={lowStockItems > 0 ? { borderTop: '3px solid rgb(var(--danger))' } : {}}>
            <div className="flex justify-between items-center w-full">
               <h3 style={{ margin: 0 }}>⚠️ Peringatan Stok</h3>
               {lowStockItems > 0 && (
                 <a href="/restock/po" target="_blank" className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                   📄 Buat Surat PO
                 </a>
               )}
            </div>
            {lowStockList.length > 0 ? (
              <div className="flex flex-col gap-2 w-full">
                {lowStockList.map((p: any) => (
                  <Link href={`/stock/${p.id}`} key={p.id} className="flex justify-between items-center p-2 rounded-lg text-sm transition-all" style={{ background: 'rgba(var(--danger), 0.08)' }}>
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
              <Link href="/restock/po" target="_blank" className="btn btn-primary w-full text-sm">📄 Cetak PO Otomatis</Link>
              <Link href="/stock" className="btn btn-outline w-full text-sm">📦 Kelola Stok</Link>
              <Link href="/analysis" className="btn btn-outline w-full text-sm">📈 Analisis AI</Link>
              <Link href="/calculator" className="btn btn-outline w-full text-sm">🧮 Kalkulator Harga</Link>
              <Link href="/settings" className="btn btn-outline w-full text-sm">⚙️ Pengaturan</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
