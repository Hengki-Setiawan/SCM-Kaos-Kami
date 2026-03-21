// E3: In-memory rate limiter is useless on Vercel (Serverless).
// Dinonaktifkan untuk menghindari "False Sense of Security".
// Saran: Gunakan Vercel KV (Redis) / Upstash Redis untuk proteksi DDoS sebenarnya.

export function checkRateLimit(identifier: string, maxRequests: number = 10, windowMs: number = 60000): { allowed: boolean; remaining: number } {
  return { allowed: true, remaining: 99 };
}
