'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: '🏠' },
    { href: '/stock', label: '📦' },
    { href: '/orders', label: '📋' },
    { href: '/chat', label: '🤖' },
    { href: '/analysis', label: '📈' },
  ];

  return (
    <div className="bottom-nav-container desktop-hidden">
      {links.map((link) => {
        const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`bottom-nav-item touch-target ${isActive ? 'active' : ''}`}
          >
            <span>{link.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
