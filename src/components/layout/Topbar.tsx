'use client';

import Link from 'next/link';
import { Search, Bell, AlertTriangle } from 'lucide-react';
import useSWR from 'swr';
import { useState } from 'react';

const fetcher = (url: string) => fetch(url).then(res => res.json()).then(res => res.data);

export default function Topbar() {
  const { data } = useSWR('/api/dashboard/stats', fetcher, { refreshInterval: 10000 });
  const lowStockCount = data?.stats?.lowStockItems || 0;
  const lowStockList = data?.lowStockList || [];
  const [showNotif, setShowNotif] = useState(false);

  return (
    <header className="topbar glass-panel justify-between" style={{ borderRadius: 0, borderTop: 0, borderRight: 0, borderLeft: 0 }}>
      <div className="flex items-center gap-4" style={{ flex: 1, maxWidth: '400px' }}>
        {/* Global Search */}
        <Link 
          href="/stock"
          className="input-field flex items-center gap-2 touch-target" 
          style={{ width: '100%', cursor: 'pointer', padding: '0.5rem 1rem', textDecoration: 'none', transition: 'all 0.2s' }}
        >
          <Search size={16} className="text-muted" />
          <span className="text-muted" style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Cari SKU atau Barang...</span>
          <kbd className="mobile-hidden" style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', background: 'rgba(var(--foreground-rgb), 0.08)', borderRadius: '4px' }}>Cari</kbd>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        {/* Notification Bell — REAL data */}
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setShowNotif(!showNotif)}
            className="flex items-center justify-center" 
            style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(var(--surface-hover), 0.5)', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            <Bell size={20} />
          </button>
          {lowStockCount > 0 && (
            <span style={{ 
              position: 'absolute', top: '2px', right: '2px', minWidth: '18px', height: '18px', 
              background: 'rgb(var(--danger))', borderRadius: '9px', color: 'white', 
              fontSize: '0.65rem', fontWeight: 700, display: 'flex', alignItems: 'center', 
              justifyContent: 'center', padding: '0 4px', border: '2px solid rgba(var(--surface), 1)' 
            }}>
              {lowStockCount}
            </span>
          )}

          {/* Notification Dropdown */}
          {showNotif && (
            <div style={{
              position: 'absolute', top: '48px', right: 0, width: '280px', maxHeight: '300px',
              overflowY: 'auto', zIndex: 100, borderRadius: '12px', 
              background: 'rgba(var(--surface), 0.95)', backdropFilter: 'blur(16px)',
              border: '1px solid rgba(var(--border), 0.5)',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)'
            }}>
              <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(var(--border), 0.3)', fontWeight: 600, fontSize: '0.85rem' }}>
                <AlertTriangle size={14} style={{ display: 'inline', marginRight: '4px', color: 'rgb(var(--warning))' }} /> Stok Menipis ({lowStockCount})
              </div>
              {lowStockList.length > 0 ? lowStockList.slice(0, 8).map((p: any) => (
                <Link key={p.id} href={`/stock/${p.id}`} onClick={() => setShowNotif(false)}
                  style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 1rem', fontSize: '0.8rem', borderBottom: '1px solid rgba(var(--border), 0.15)', textDecoration: 'none', color: 'inherit', transition: 'background 0.15s' }}
                  className="hover-bg"
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>{p.name}</span>
                  <span style={{ color: 'rgb(var(--danger))', fontWeight: 700, whiteSpace: 'nowrap' }}>{p.currentStock}/{p.minStock}</span>
                </Link>
              )) : (
                <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.8rem' }} className="text-muted">Semua stok aman ✅</div>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2" style={{ padding: '0.25rem 0.25rem 0.25rem 0.5rem', borderLeft: '1px solid rgba(var(--border), 0.5)' }}>
          <div className="flex flex-col text-right mobile-hidden">
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Hengki Setiawan</span>
            <span style={{ fontSize: '0.75rem' }} className="text-muted">Admin</span>
          </div>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--accent)))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>
            HS
          </div>
        </div>
      </div>
    </header>
  );
}
