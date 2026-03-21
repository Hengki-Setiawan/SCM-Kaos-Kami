'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const crumbMap: Record<string, string> = {
  '': 'Dashboard', stock: 'Stok', orders: 'Pesanan', chat: 'Chat AI',
  calculator: 'Kalkulator', analysis: 'Analisis', settings: 'Pengaturan',
  history: 'Riwayat', new: 'Baru', scan: 'Scan Resi', restock: 'Restock', po: 'Purchase Order',
  finance: 'Keuangan', admin: 'Admin', suppliers: 'Supplier', activity: 'Aktivitas'
};

export default function Breadcrumb() {
  const pathname = usePathname();
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'rgb(var(--text-muted))', marginBottom: '1rem', flexWrap: 'wrap' }}>
      <Link href="/" style={{ textDecoration: 'none', color: 'rgb(var(--text-muted))' }}>Dashboard</Link>
      {parts.map((part, i) => {
        const href = '/' + parts.slice(0, i + 1).join('/');
        const isLast = i === parts.length - 1;
        const label = crumbMap[part] || (part.length > 20 ? part.slice(0, 8) + '...' : part);
        return (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ opacity: 0.4 }}>/</span>
            {isLast ? (
              <span style={{ color: 'rgb(var(--foreground-rgb))', fontWeight: 500 }}>{label}</span>
            ) : (
              <Link href={href} style={{ textDecoration: 'none', color: 'rgb(var(--text-muted))' }}>{label}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
