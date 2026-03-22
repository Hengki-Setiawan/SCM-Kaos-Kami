'use client';

import { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export default function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [showBanner, setShowBanner] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const goOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        setShowBanner(true);
        setTimeout(() => setShowBanner(false), 4000);
      }
    };

    const goOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      setShowBanner(true);
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [wasOffline]);

  if (!showBanner) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '1rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        padding: '0.6rem 1.2rem',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: '0.8rem',
        fontWeight: 600,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        animation: 'fadeInUp 0.3s ease-out',
        boxShadow: '0 8px 25px -5px rgba(0,0,0,0.2)',
        ...(isOnline
          ? {
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: 'rgb(16, 185, 129)',
            }
          : {
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: 'rgb(239, 68, 68)',
            }),
      }}
    >
      {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
      {isOnline ? 'Koneksi pulih — kembali online!' : 'Anda sedang offline'}
      <button
        onClick={() => setShowBanner(false)}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'inherit',
          cursor: 'pointer',
          padding: '0 0.25rem',
          fontSize: '1rem',
          lineHeight: 1,
          marginLeft: '0.25rem',
        }}
      >
        ×
      </button>
    </div>
  );
}
