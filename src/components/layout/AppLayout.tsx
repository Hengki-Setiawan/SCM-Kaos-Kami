import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import BottomNav from './BottomNav';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <Topbar />
        <div className="page-container">
          {children}
        </div>
      </main>
      
      {/* Bottom Nav for Mobile */}
      <BottomNav />
    </div>
  );
}
