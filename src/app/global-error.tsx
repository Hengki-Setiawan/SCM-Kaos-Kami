'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error ke API endpoint internal untuk monitoring
    try {
      fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: 'error',
          message: error.message || 'Unknown Error',
          stack: error.stack?.slice(0, 500),
          digest: error.digest,
          url: typeof window !== 'undefined' ? window.location.href : '',
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => { /* silent fail - logging should not break UX */ });
    } catch (e) { /* silent */ }

    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', textAlign: 'center', padding: '1rem', fontFamily: 'Inter, system-ui, sans-serif' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Aduh! Terjadi Kesalahan Sistem.</h2>
          <p style={{ color: '#888', marginBottom: '1.5rem', maxWidth: '32rem' }}>
            Error ini telah tercatat di sistem monitoring kami. Silakan muat ulang halaman.
          </p>
          <pre style={{ fontSize: '0.75rem', textAlign: 'left', padding: '1rem', borderRadius: '0.5rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', maxWidth: '42rem', width: '100%', overflowX: 'auto', marginBottom: '1.5rem' }}>
            {error.message || 'Unknown Error'}
            {'\n'}
            Digest: {error.digest}
          </pre>
          <button
            onClick={() => reset()}
            style={{ padding: '0.75rem 2rem', background: '#6366f1', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 600 }}
          >
            Coba Lagi
          </button>
        </div>
      </body>
    </html>
  );
}
