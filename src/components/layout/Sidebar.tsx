import Link from 'next/link';
import { ReactNode } from 'react';

export default function Sidebar() {
  const menuItems = [
    { name: 'Dashboard', icon: '📊', path: '/' },
    { name: 'Manajemen Stok', icon: '📦', path: '/stock' },
    { name: 'Proses Pesanan', icon: '📋', path: '/orders' },
    { name: 'AI Assistant', icon: '🤖', path: '/chat' },
    { name: 'Analisis Gudang', icon: '📈', path: '/analysis' },
    { name: 'Kalkulator Harga', icon: '🧮', path: '/calculator' },
    { name: 'Riwayat Stok', icon: '📜', path: '/history' },
    { name: 'Scan Resi', icon: '📸', path: '/orders/scan' },
    { name: 'Pengaturan', icon: '⚙️', path: '/settings' },
  ];

  return (
    <aside className="sidebar glass-panel" style={{ borderRadius: 0, borderTop: 0, borderBottom: 0, borderLeft: 0 }}>
      <div className="flex items-center gap-2" style={{ padding: '1.5rem', borderBottom: '1px solid rgba(var(--border), 0.5)' }}>
        <span style={{ fontSize: '1.5rem' }}>🧵</span>
        <h1 style={{ fontSize: '1.25rem', marginBottom: 0 }}>Kaos Kami</h1>
      </div>
      
      <nav style={{ padding: '1rem 0', flex: 1, overflowY: 'auto' }}>
        <ul style={{ listStyle: 'none' }}>
          {menuItems.map((item) => (
            <li key={item.path}>
              <Link 
                href={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1.5rem',
                  color: 'rgb(var(--foreground-rgb))',
                  transition: 'background 0.2s',
                }}
                className="hover-bg"
              >
                <span style={{ fontSize: '1.25rem' }}>{item.icon}</span>
                <span style={{ fontWeight: 500 }}>{item.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      
      <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(var(--border), 0.5)', fontSize: '0.75rem', textAlign: 'center' }} className="text-muted">
        © Kaos Kami SCM
      </div>
    </aside>
  );
}
