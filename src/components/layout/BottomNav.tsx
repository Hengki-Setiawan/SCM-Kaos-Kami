'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Package, ShoppingBag, MessageSquare, BarChart3 } from 'lucide-react';

const links = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/stock', label: 'Stok', icon: Package },
  { href: '/orders', label: 'Order', icon: ShoppingBag },
  { href: '/chat', label: 'Chat', icon: MessageSquare },
  { href: '/analysis', label: 'Analisis', icon: BarChart3 },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="bottom-nav-container desktop-hidden">
      {links.map((link) => {
        const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`bottom-nav-item touch-target ${isActive ? 'active' : ''}`}
          >
            <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
            <span className="bottom-nav-label">{link.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
