import { NextResponse } from 'next/server';

// Endpoint sederhana untuk menerima log error dari frontend (global-error.tsx)
// Di tahap produksi sesungguhnya, ini akan ditembak ke Sentry / Datadog / DB Tabel
export async function POST(req: Request) {
  try {
    const errorData = await req.json();
    
    // Log to server console (which Vercel captures in their Logs tab)
    console.error('[FRONTEND_CRITICAL_ERROR]', JSON.stringify(errorData, null, 2));

    // Anda bisa menambahkan logika insert ke database tabel `error_logs` di sini
    // await db.insert(errorLogs).values({ ... });

    return NextResponse.json({ success: true, message: 'Log recorded' });
  } catch (e) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
