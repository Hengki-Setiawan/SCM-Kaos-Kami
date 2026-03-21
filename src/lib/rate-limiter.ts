// E3: Simple in-memory rate limiter
const requests = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(identifier: string, maxRequests: number = 10, windowMs: number = 60000): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = requests.get(identifier);
  
  if (!entry || now > entry.resetAt) {
    requests.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }
  
  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }
  
  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count };
}

// Cleanup old entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of requests) {
      if (now > val.resetAt) requests.delete(key);
    }
  }, 300000);
}
