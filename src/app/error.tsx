'use client';

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '1rem', textAlign: 'center', padding: '2rem' }}>
      <span style={{ fontSize: '3rem' }}>😵</span>
      <h2 style={{ fontSize: '1.25rem' }}>Terjadi Kesalahan</h2>
      <p style={{ color: 'rgb(var(--text-muted))', maxWidth: 400 }}>{error.message || 'Sesuatu tidak beres. Silakan coba lagi.'}</p>
      <button className="btn btn-primary" onClick={reset}>🔄 Coba Lagi</button>
    </div>
  );
}
