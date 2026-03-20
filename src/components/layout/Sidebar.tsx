'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, ClipboardList, Bot, TrendingUp, Calculator, History, ScanLine, Settings, Shirt } from 'lucide-react';

const menuItems = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { name: 'Manajemen Stok', icon: Package, path: '/stock' },
  { name: 'Proses Pesanan', icon: ClipboardList, path: '/orders' },
  { name: 'AI Assistant', icon: Bot, path: '/chat' },
  { name: 'Analisis Gudang', icon: TrendingUp, path: '/analysis' },
  { name: 'Kalkulator Harga', icon: Calculator, path: '/calculator' },
  { name: 'Riwayat Stok', icon: History, path: '/history' },
  { name: 'Scan Resi', icon: ScanLine, path: '/orders/scan' },
  { name: 'Pengaturan', icon: Settings, path: '/settings' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar glass-panel" style={{ borderRadius: 0, borderTop: 0, borderBottom: 0, borderLeft: 0 }}>
      <div className="flex items-center gap-3" style={{ padding: '1.5rem', borderBottom: '1px solid rgba(var(--border), 0.5)' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--accent)))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Shirt size={20} color="white" />
        </div>
        <h1 style={{ fontSize: '1.25rem', marginBottom: 0, background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--accent)))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Kaos Kami</h1>
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
      
      <div style={{ padding: '1.25rem', borderTop: '1px solid rgba(var(--border), 0.5)', fontSize: '0.7rem', textAlign: 'center' }} className="text-muted">
        © 2026 Kaos Kami SCM
      </div>
    </aside>
  );
}
