'use client';

import { useState, useEffect, createContext, useContext, useCallback, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';
type Toast = { id: number; message: string; type: ToastType };

const ToastContext = createContext<{
  showToast: (message: string, type?: ToastType) => void;
}>({ showToast: () => {} });

export function useToast() { return useContext(ToastContext); }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const colors: Record<ToastType, string> = {
    success: 'rgb(var(--success))',
    error: 'rgb(var(--danger))',
    warning: 'rgb(var(--warning))',
    info: 'rgb(var(--info))',
  };
  const icons: Record<ToastType, string> = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: 'rgba(var(--surface), 0.95)', backdropFilter: 'blur(12px)',
            borderLeft: `4px solid ${colors[t.type]}`, borderRadius: 12, padding: '14px 20px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', gap: 10,
            animation: 'fadeInUp 0.3s ease-out', minWidth: 280, maxWidth: 420,
          }}>
            <span style={{ fontSize: '1.1rem' }}>{icons[t.type]}</span>
            <span style={{ fontSize: '0.875rem', flex: 1 }}>{t.message}</span>
            <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5, fontSize: '1rem' }}>✕</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
