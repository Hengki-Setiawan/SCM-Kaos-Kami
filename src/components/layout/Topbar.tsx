import Link from 'next/link';
import { ReactNode } from 'react';

export default function Topbar() {
  return (
    <header className="topbar glass-panel justify-between" style={{ borderRadius: 0, borderTop: 0, borderRight: 0, borderLeft: 0 }}>
      <div className="flex items-center gap-4" style={{ flex: 1, maxWidth: '400px' }}>
        {/* Global Search Button */}
        <button 
          className="input-field flex items-center gap-2 touch-target" 
          style={{ width: '100%', cursor: 'pointer', padding: '0.5rem 1rem' }}
          disabled
        >
          <span style={{ fontSize: '1rem' }}>🔍</span>
          <span className="text-muted" style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Cari...</span>
          <kbd className="mobile-hidden" style={{ fontSize: '0.7rem', padding: '0.1rem 0.3rem', background: 'rgba(var(--foreground-rgb), 0.1)', borderRadius: '4px' }}>Ctrl+K</kbd>
        </button>
      </div>

      <div className="flex items-center gap-4">
        {/* Quick Actions */}
        <button className="flex items-center justify-center" style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(var(--surface-hover), 0.5)', border: 'none', cursor: 'pointer', fontSize: '1.25rem' }}>
          🔔
          {/* Notification Badge Example */}
          <span style={{ position: 'absolute', top: '10px', right: '10px', width: '8px', height: '8px', background: 'rgb(var(--danger))', borderRadius: '50%' }}></span>
        </button>
        
        <div className="flex items-center gap-2" style={{ padding: '0.25rem 0.25rem 0.25rem 0.5rem', borderLeft: '1px solid rgba(var(--border), 0.5)' }}>
          <div className="flex flex-col text-right mobile-hidden">
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Hengki Setiawan</span>
            <span style={{ fontSize: '0.75rem' }} className="text-muted">Admin</span>
          </div>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--accent)))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
            HS
          </div>
        </div>
      </div>
    </header>
  );
}
