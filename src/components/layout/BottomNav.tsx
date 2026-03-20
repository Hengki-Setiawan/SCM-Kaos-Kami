'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();

  const links = [
    { href: '/dashboard', label: '🏠' },
    { href: '/stock', label: '📦' },
    { href: '/orders', label: '📋' },
    { href: '/chat', label: '🤖' },
    { href: '/analysis', label: '📈' },
  ];

  // Sembunyikan kalau sedang tidak di dalam dashboard area (misal: halaman login jika ada)
  if (pathname === '/') return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-[rgba(var(--background),0.8)] backdrop-blur-xl border-t border-[rgba(var(--border),0.5)] flex items-center justify-around md:hidden z-50 pb-safe">
      {links.map((link) => {
        const isActive = pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex flex-col items-center justify-center w-full h-full text-2xl transition-all duration-300 ${
              isActive ? 'text-[rgb(var(--primary))] scale-110 drop-shadow-[0_0_10px_rgba(var(--primary),0.5))]' : 'text-muted hover:text-[rgb(var(--foreground))] opacity-50'
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
