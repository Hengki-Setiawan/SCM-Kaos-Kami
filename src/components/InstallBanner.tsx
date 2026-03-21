'use client';

import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!localStorage.getItem('pwa_dismissed')) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa_dismissed', 'true');
  };

  if (!showBanner) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '2rem',
        right: '2rem',
        zIndex: 100,
        width: '320px',
        maxWidth: '90vw',
      }}
      className="fadeInUp"
    >
      <div 
        className="glass-card" 
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '0.75rem', 
          padding: '1.25rem',
          border: '2px solid rgb(var(--primary))',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          background: 'rgba(var(--surface), 0.95)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ padding: '0.5rem', background: 'rgba(var(--primary), 0.1)', borderRadius: '8px', color: 'rgb(var(--primary))', display: 'flex' }}>
              <Download size={18} />
            </div>
            <h4 style={{ fontWeight: 700, fontSize: '0.875rem', margin: 0 }}>Instal Aplikasi SCM</h4>
          </div>
          <button 
            onClick={handleDismiss} 
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgb(var(--text-muted))', padding: '0.25rem' }}
          >
            <X size={16} />
          </button>
        </div>
        <p style={{ fontSize: '0.75rem', lineHeight: 1.5, margin: 0 }} className="text-muted">
          Akses cepat ke gudang langsung dari home screen HP Anda tanpa browser.
        </p>
        <button 
          onClick={handleInstall} 
          className="btn btn-primary" 
          style={{ width: '100%', fontSize: '0.8rem', minHeight: '36px' }}
        >
          Pasang Sekarang
        </button>
      </div>
    </div>
  );
}
