'use client';

import { useState, createContext, useContext, useCallback, ReactNode } from 'react';

type ConfirmOptions = { title: string; message: string; confirmText?: string; danger?: boolean };

const ConfirmContext = createContext<{
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}>({ confirm: async () => false });

export function useConfirm() { return useContext(ConfirmContext); }

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise(resolve => setState({ ...opts, resolve }));
  }, []);

  const handleClose = (result: boolean) => { state?.resolve(result); setState(null); };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => handleClose(false)}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} />
          <div onClick={e => e.stopPropagation()} style={{
            position: 'relative', background: 'rgb(var(--surface))', borderRadius: 16, padding: '2rem',
            maxWidth: 420, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', animation: 'fadeInUp 0.2s ease-out',
          }}>
            <h3 style={{ marginBottom: '0.75rem', fontSize: '1.15rem' }}>{state.title}</h3>
            <p style={{ color: 'rgb(var(--text-muted))', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>{state.message}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-outline" onClick={() => handleClose(false)}>Batal</button>
              <button className={`btn ${state.danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => handleClose(true)}>
                {state.confirmText || 'Konfirmasi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
