'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import BottomNav from './BottomNav';
import Breadcrumb from '@/components/Breadcrumb';

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  
  // D10: Login page clean layout
  if (pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <Topbar />
        <div className="page-container">
          <Breadcrumb />
          {children}
        </div>
      </main>
      
      {/* Bottom Nav for Mobile */}
      <BottomNav />
    </div>
  );
}
