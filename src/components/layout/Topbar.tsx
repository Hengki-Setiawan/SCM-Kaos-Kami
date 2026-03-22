'use client';

import Link from 'next/link';
import { Search, Bell, AlertTriangle, Moon, Sun } from 'lucide-react';
import useSWR from 'swr';
import { useState, useEffect } from 'react';

const fetcher = (url: string) => fetch(url).then(res => res.json()).then(res => res.data);

export default function Topbar() {
  const { data } = useSWR('/api/dashboard/stats', fetcher, { refreshInterval: 30000 });
  const lowStockCount = data?.stats?.lowStockItems || 0;
  const lowStockList = data?.lowStockList || [];
  const [showNotif, setShowNotif] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [profile, setProfile] = useState({ brandName: 'Kaos Kami', adminName: 'Hengki Setiawan' });

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') { setIsDark(true); document.documentElement.classList.add('dark'); }
    
    const loadProfile = () => {
      const savedProfile = localStorage.getItem('business_profile');
      if (savedProfile) {
        try { setProfile(JSON.parse(savedProfile)); } catch(e) {}
      }
    };
    loadProfile();
    window.addEventListener('business_profile_updated', loadProfile);
    return () => window.removeEventListener('business_profile_updated', loadProfile);
  }, []);

  const toggleDark = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  // Ctrl+K opens search dialog (handled by SearchDialog component)
  const openSearch = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
  };

  return (
    <header className="topbar glass-panel justify-between" role="banner" style={{ borderRadius: 0, borderTop: 0, borderRight: 0, borderLeft: 0 }}>
      <div className="flex items-center gap-3 w-full" style={{ flex: 1, maxWidth: '400px', minWidth: '40px' }}>
        <button 
          onClick={openSearch}
          className="input-field flex items-center gap-2 touch-target w-full" 
          aria-label="Buka pencarian (Ctrl+K)"
          style={{ minWidth: 0, cursor: 'pointer', padding: '0.5rem 0.8rem', textDecoration: 'none', transition: 'all 0.2s', textAlign: 'left', border: '1px solid rgba(var(--border), 0.7)', background: 'rgba(var(--surface), 0.5)' }}
        >
          <Search size={16} className="text-muted flex-shrink-0" />
          <span className="text-muted truncate min-w-0 text-left text-sm mobile-hidden" style={{ flex: 1 }}>Cari SKU/Barang...</span>
          <kbd className="mobile-hidden flex-shrink-0" style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', background: 'rgba(var(--foreground-rgb), 0.08)', borderRadius: '4px' }}>Ctrl+K</kbd>
        </button>
      </div>

      <div className="flex items-center gap-2 no-shrink">
        {/* Dark Mode Toggle — D1 */}
        <button onClick={toggleDark} className="btn-ghost" aria-label={isDark ? 'Mode terang' : 'Mode gelap'} title={isDark ? 'Mode Terang' : 'Mode Gelap'}>
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notification Bell */}
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setShowNotif(!showNotif)}
            className="btn-ghost" 
            aria-label={`Notifikasi stok menipis (${lowStockCount})`}
            style={{ width: '40px', height: '40px', borderRadius: '50%', position: 'relative' }}
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
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{profile.adminName}</span>
            <span style={{ fontSize: '0.75rem' }} className="text-muted">Admin {profile.brandName}</span>
          </div>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--accent)))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>
            {profile.adminName.substring(0,2).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}

