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
        <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
          <h2 className="text-2xl font-bold mb-4">Aduh! Terjadi Kesalahan Sistem.</h2>
          <p className="text-muted mb-6 max-w-lg">
            Kami mencatat error ini untuk diinvestigasi. Anda bisa mencoba memuat ulang halaman.
          </p>
          <pre className="text-xs text-left p-4 rounded-lg bg-[rgba(var(--danger),0.1)] text-[rgb(var(--danger))] max-w-2xl w-full overflow-x-auto mb-6">
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
