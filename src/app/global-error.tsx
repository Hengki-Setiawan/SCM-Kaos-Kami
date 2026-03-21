'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', textAlign: 'center', padding: '1rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Aduh! Terjadi Kesalahan Sistem.</h2>
          <p style={{ color: '#888', marginBottom: '1.5rem', maxWidth: '32rem' }}>
            Silakan muat ulang halaman atau kembali ke dashboard utama.
          </p>
          <pre style={{ fontSize: '0.75rem', textAlign: 'left', padding: '1rem', borderRadius: '0.5rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', maxWidth: '42rem', width: '100%', overflowX: 'auto', marginBottom: '1.5rem' }}>
            {error.message || 'Unknown Error'}
            {'\n'}
            Digest: {error.digest}
          </pre>
          <button
            onClick={() => reset()}
            className="btn btn-primary"
          >
            Coba Lagi
          </button>
        </div>
      </body>
    </html>
  );
}

