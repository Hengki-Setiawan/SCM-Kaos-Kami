'use client';

import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Boxes, Warehouse, AlertTriangle, Clock, History, FileText, Package, TrendingUp, Calculator, Settings, ScanLine, Sparkles, Plus, BarChart3, Wallet, TrendingDown, Download } from 'lucide-react';
import { formatRupiah } from '@/lib/utils';

const fetcher = (url: string) => fetch(url).then(res => res.json()).then(res => res.data);

export default function DashboardClient({ initialData }: { initialData: any }) {
  const [showInstallButton, setShowInstallButton] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      (window as any).deferredPrompt = e;
      setShowInstallButton(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const { data, error } = useSWR('/api/dashboard/stats', fetcher, {
    fallbackData: initialData,
    refreshInterval: 30000,
    revalidateOnFocus: true,
  });

  const { data: chartData } = useSWR('/api/dashboard/charts', fetcher);

  const displayData = data || initialData;
  const { totalProducts, totalStock, lowStockItems, totalValue, revenue, expense, hpp, netProfit } = displayData.stats;
  const pendingOrderCount = displayData.pendingOrderCount;
  const recentMovements = displayData.recentMovements || [];
  const lowStockList = displayData.lowStockList || [];

  // Chart scaling logic
  const maxVal = chartData ? Math.max(...chartData.map((d: any) => Math.max(d.revenue, d.expense)), 100000) : 100000;

  return (
    <>
      <div className="flex justify-between items-start mobile-col mobile-gap-2 mb-2">
        <div>
          <div className="flex items-center gap-2">
            <h1>Dashboard Kaos Kami</h1>
            <span className="flex h-3 w-3 relative mb-2" title="Live Sync Active">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[rgb(var(--success))] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[rgb(var(--success))]"></span>
            </span>
          </div>
          <p className="text-muted">Ringkasan stok dan performa finansial hari ini.</p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 mobile-scroll-x hide-scrollbar" style={{ flex: 1 }}>
       <Link href="/orders/new" className="btn btn-primary touch-target"><Plus size={16} /> Pesanan Baru</Link>
          <div className="flex gap-2">
            <Link href="/orders/scan" className="btn btn-outline touch-target" style={{ flex: 1 }}><ScanLine size={16} /> Scan Resi</Link>
            <Link href="/chat" className="btn btn-outline touch-target" style={{ flex: 1 }}><Sparkles size={16} /> Tanya AI</Link>
          </div>
        </div>
      </div>

      {/* Financial Performance Grid (Phase 2 Addition) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="glass-card" style={{ borderLeft: '4px solid rgb(var(--success))' }}>
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs text-muted block mb-1">Total Penjualan (Gross)</span>
              <span className="text-xl font-bold text-[rgb(var(--success))]">{formatRupiah(revenue)}</span>
            </div>
            <TrendingUp size={20} className="text-[rgb(var(--success))]" />
          </div>
        </div>
        <div className="glass-card" style={{ borderLeft: '4px solid rgb(var(--danger))' }}>
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs text-muted block mb-1">Beban Operasional & HPP</span>
              <span className="text-xl font-bold text-[rgb(var(--danger))]">{formatRupiah(expense + hpp)}</span>
            </div>
            <TrendingDown size={20} className="text-[rgb(var(--danger))]" />
          </div>
        </div>
        <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(var(--primary),0.1), rgba(var(--accent),0.1))', borderLeft: '4px solid rgb(var(--primary))' }}>
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs text-muted block mb-1">Laba Bersih (Net Profit)</span>
              <span className="text-2xl font-bold text-[rgb(var(--primary))]">{formatRupiah(netProfit)}</span>
            </div>
            <Wallet size={24} className="text-[rgb(var(--primary))]" />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 mobile-grid-cols-2 gap-6">
        <div className="glass-card flex flex-col gap-2 transition-all">
          <div className="flex items-center gap-2">
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(var(--primary), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Boxes size={18} style={{ color: 'rgb(var(--primary))' }} /></div>
            <span className="text-muted" style={{ fontSize: '0.8rem' }}>Varian Produk</span>
          </div>
          <span style={{ fontSize: '2rem', fontWeight: 700 }}>{totalProducts}</span>
        </div>
        <div className="glass-card flex flex-col gap-2 transition-all">
          <div className="flex items-center gap-2">
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(var(--accent), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Warehouse size={18} style={{ color: 'rgb(var(--accent))' }} /></div>
            <span className="text-muted" style={{ fontSize: '0.8rem' }}>Item Gudang</span>
          </div>
          <span style={{ fontSize: '2rem', fontWeight: 700 }}>{totalStock}</span>
        </div>
        <div className="glass-card flex flex-col gap-2 transition-all" style={lowStockItems > 0 ? { borderLeft: '4px solid rgb(var(--warning))' } : {}}>
          <div className="flex items-center gap-2">
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(var(--warning), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><AlertTriangle size={18} style={{ color: 'rgb(var(--warning))' }} /></div>
            <span className="text-muted" style={{ fontSize: '0.8rem' }}>Stok Menipis</span>
          </div>
          <span style={{ fontSize: '2rem', fontWeight: 700, color: lowStockItems > 0 ? 'rgb(var(--warning))' : 'inherit' }}>{lowStockItems}</span>
        </div>
        <div className="glass-card flex flex-col gap-2 transition-all" style={pendingOrderCount > 0 ? { borderLeft: '4px solid rgb(var(--info))' } : {}}>
          <div className="flex items-center gap-2">
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(var(--info), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Clock size={18} style={{ color: 'rgb(var(--info))' }} /></div>
            <span className="text-muted" style={{ fontSize: '0.8rem' }}>Pending</span>
          </div>
          <span style={{ fontSize: '2rem', fontWeight: 700, color: pendingOrderCount > 0 ? 'rgb(var(--info))' : 'inherit' }}>{pendingOrderCount}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2">
          <div className="glass-card h-full">
          <div className="flex justify-between items-center mb-6">
            <h3 style={{ margin: 0 }} className="flex items-center gap-2"><BarChart3 size={18} className="text-[rgb(var(--primary))]" /> Statistik Penjualan vs Biaya</h3>
            <div className="flex gap-4">
               <div className="flex items-center gap-1"><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgb(var(--primary))' }}></span><span className="text-[10px] text-muted">Penjualan</span></div>
               <div className="flex items-center gap-1"><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgb(var(--danger))' }}></span><span className="text-[10px] text-muted">Biaya</span></div>
            </div>
          </div>
          <div style={{ height: '220px', width: '100%', position: 'relative', display: 'flex', alignItems: 'flex-end', gap: '8px', paddingBottom: '20px', borderBottom: '1px solid rgba(var(--border),0.5)' }}>
            {!chartData ? (
               <div className="absolute inset-0 flex items-center justify-center text-muted text-sm">Loading chart...</div>
            ) : chartData.map((d: any, i: number) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', width: '100%', height: '100%' }}>
                  <div style={{ flex: 1, height: `${(d.revenue / maxVal) * 100}%`, background: 'rgba(var(--primary), 0.8)', borderRadius: '2px 2px 0 0', position: 'relative' }}>
                    {d.revenue > 0 && <div className="chart-tooltip text-[8px]">{new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(d.revenue)}</div>}
                  </div>
                  <div style={{ flex: 1, height: `${(d.expense / maxVal) * 100}%`, background: 'rgba(var(--danger), 0.8)', borderRadius: '2px 2px 0 0', position: 'relative' }}>
                    {d.expense > 0 && <div className="chart-tooltip text-[8px] text-danger">{new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(d.expense)}</div>}
                  </div>
                </div>
                <div style={{ fontSize: '0.6rem', color: 'rgb(var(--text-muted))', marginTop: '8px' }}>{d.label}</div>
              </div>
            ))}
          </div>
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-1">
          <div className="glass-card">
            <span className="text-muted text-xs block mb-3 uppercase tracking-widest font-semibold flex items-center gap-1">
              <Sparkles size={18} /> Aksi Cepat
            </span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Link href="/finance" className="btn btn-primary w-full text-sm"><Wallet size={14} /> Catat Pengeluaran</Link>
              <Link href="/stock" className="btn btn-outline w-full text-sm"><Package size={14} /> Kelola Stok</Link>
              <Link href="/orders" className="btn btn-outline w-full text-sm"><FileText size={14} /> Proses Pesanan</Link>
              {showInstallButton && (
                <button
                  id="install-button"
                  className="btn btn-outline w-full text-sm"
                  onClick={() => {
                    const promptEvent = (window as any).deferredPrompt;
                    if (promptEvent) {
                      promptEvent.prompt();
                      promptEvent.userChoice.then(() => {
                        (window as any).deferredPrompt = null;
                        setShowInstallButton(false); // Hide button after user choice
                      });
                    } else {
                      alert('Aplikasi sudah terpasang atau browser Anda tidak mendukung.');
                    }
                  }}
                >
                  <Download size={14} /> Install Aplikasi
                </button>
              )}
            </div>
          </div>
          
          <div className="glass-card flex flex-col gap-2" style={{ background: 'rgba(var(--primary), 0.05)' }}>
             <span className="text-muted text-xs block uppercase tracking-widest">Aset Bersih</span>
             <span className="text-2xl font-bold">{formatRupiah(totalValue)}</span>
             <p className="text-[10px] text-muted italic mt-auto">Nilai estimasi total stok yang ada di gudang saat ini.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 mt-6">
        <div className="glass-card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="flex items-center gap-2" style={{ margin: 0 }}><History size={18} /> Aktivitas Stok Terakhir</h3>
            <Link href="/activity" style={{ color: 'rgb(var(--primary))', fontSize: '0.85rem' }}>Lihat Semua →</Link>
          </div>
          {recentMovements.length === 0 ? (
            <p className="text-muted text-sm">Belum ada aktivitas hari ini.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
               {recentMovements.slice(0, 6).map((m: any) => (
                <div key={m.id} className="activity-item">
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: m.type === 'IN' ? 'rgba(var(--success),0.1)' : 'rgba(var(--danger),0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>
                    {m.type === 'IN' ? '➕' : '➖'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold truncate block">{m.productName || 'Produk'}</span>
                    <span className="text-[10px] text-muted block truncate font-medium">{m.reason}</span>
                  </div>
                  <span className={`text-sm font-bold no-shrink ${m.type === 'IN' ? 'text-[rgb(var(--success))]' : 'text-[rgb(var(--danger))]'}`}>
                    {m.type === 'IN' ? '+' : '-'}{m.quantity}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
