'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, ClipboardList, Bot, TrendingUp, Calculator, History, ScanLine, Settings, Shirt, LogOut, Wallet, Download, Users } from 'lucide-react';
import { logoutAction } from '@/app/actions/auth';

const menuItems = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { name: 'Manajemen Stok', icon: Package, path: '/stock' },
  { name: 'Proses Pesanan', icon: ClipboardList, path: '/orders' },
  { name: 'AI Assistant', icon: Bot, path: '/chat' },
  { name: 'Analisis Gudang', icon: TrendingUp, path: '/analysis' },
  { name: 'Kalkulator Harga', icon: Calculator, path: '/calculator' },
  { name: 'Supplier', icon: Users, path: '/admin/suppliers' },
  { name: 'Keuangan', icon: Wallet, path: '/finance' },
  { name: 'Jejak Audit', icon: History, path: '/activity' },
  { name: 'Scan Resi', icon: ScanLine, path: '/orders/scan' },
  { name: 'Export Center', icon: Download, path: '/admin/export' },
  { name: 'Pengaturan', icon: Settings, path: '/settings' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar glass-panel" style={{ borderRadius: 0, borderTop: 0, borderBottom: 0, borderLeft: 0 }}>
      <div className="flex items-center gap-3" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(var(--border), 0.5)' }}>
        <img 
          src="/logo-dark.png" 
          alt="Kaos Kami Logo" 
          style={{ width: '40px', height: '40px', objectFit: 'contain' }}
          className="dark:hidden"
          onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling!.removeAttribute('style'); }}
        />
        <img 
          src="/logo-light.png" 
          alt="Kaos Kami Logo" 
          style={{ width: '40px', height: '40px', objectFit: 'contain' }}
          className="hidden dark:block"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
        {/* Fallback Text if image is missing */}
        <h1 style={{ display: 'none', fontSize: '1.25rem', marginBottom: 0, background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--accent)))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Stok KaosKami
        </h1>
      </div>
      
      <nav style={{ padding: '0.75rem 0', flex: 1, overflowY: 'auto' }}>
        <ul style={{ listStyle: 'none' }}>
          {menuItems.map((item) => {
            const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
            const Icon = item.icon;
            return (
              <li key={item.path}>
                <Link 
                  href={item.path}
                  aria-label={item.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.7rem 1.5rem',
                    color: isActive ? 'rgb(var(--primary))' : 'rgb(var(--foreground-rgb))',
                    background: isActive ? 'rgba(var(--primary), 0.08)' : 'transparent',
                    borderLeft: isActive ? '3px solid rgb(var(--primary))' : '3px solid transparent',
                    transition: 'all 0.2s ease',
                    fontWeight: isActive ? 600 : 400,
                  }}
                  className="hover-bg"
                >
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      {/* Sidebar Footer */}
      <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(var(--border), 0.5)' }}>
        <button 
          onClick={() => logoutAction()}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.8rem 1.5rem', border: 'none', background: 'transparent', cursor: 'pointer', color: 'rgb(var(--danger))', fontWeight: 600, transition: 'all 0.2s' }}
          className="hover-bg"
        >
          <LogOut size={18} strokeWidth={2} />
          <span>Keluar</span>
        </button>
        
        <div style={{ padding: '1rem', background: 'rgba(var(--foreground-rgb), 0.02)', fontSize: '0.65rem', textAlign: 'center' }} className="text-muted">
          © 2026 Kaos Kami SCM
        </div>
      </div>
    </aside>
  );
}
