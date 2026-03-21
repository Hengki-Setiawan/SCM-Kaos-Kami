import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem', textAlign: 'center' }}>
      <span style={{ fontSize: '4rem' }}>🔍</span>
      <h1>404 — Halaman Tidak Ditemukan</h1>
      <p className="text-muted">Halaman yang Anda cari tidak ada atau telah dipindahkan.</p>
      <Link href="/" className="btn btn-primary">← Kembali ke Dashboard</Link>
    </div>
  );
}
