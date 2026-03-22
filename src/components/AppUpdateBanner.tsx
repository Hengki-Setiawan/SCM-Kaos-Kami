'use client';

import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

export default function AppUpdateBanner() {
  const [showUpdate, setShowUpdate] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // Check for SW updates
    const checkForUpdate = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) return;

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              // New version available
              setShowUpdate(true);
            }
          });
        });

        // Also check manually
        registration.update();
      } catch (e) {
        // silent
      }
    };

    checkForUpdate();

    // Listen for controller change (new SW activated)
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }, []);

  const handleUpdate = () => {
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg?.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    });
    setShowUpdate(false);
  };

  if (!showUpdate) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '5rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        padding: '0.75rem 1.25rem',
        borderRadius: '14px',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        fontSize: '0.8rem',
        fontWeight: 500,
        background: 'rgba(99, 102, 241, 0.12)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(99, 102, 241, 0.35)',
        boxShadow: '0 12px 30px -8px rgba(0,0,0,0.2)',
        animation: 'fadeInUp 0.3s ease-out',
        color: 'rgb(var(--foreground-rgb))',
        whiteSpace: 'nowrap',
      }}
    >
      <RefreshCw size={16} style={{ color: 'rgb(99, 102, 241)' }} />
      <span>Update tersedia!</span>
      <button
        onClick={handleUpdate}
        style={{
          padding: '0.35rem 0.75rem',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '0.75rem',
          transition: 'all 0.2s',
        }}
      >
        Refresh
      </button>
      <button
        onClick={() => setShowUpdate(false)}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'rgb(var(--text-muted))',
          cursor: 'pointer',
          padding: '0 0.2rem',
          fontSize: '1.1rem',
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}
