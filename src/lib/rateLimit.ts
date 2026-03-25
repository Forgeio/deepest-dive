// Simple in-memory rate limiter.
// In production, replace with Redis-backed solution (e.g. upstash/ratelimit).

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitRecord>();

// Clean up old entries every 5 minutes
if (typeof globalThis !== "undefined") {
  const cleanup = () => {
    const now = Date.now();
    for (const [key, rec] of Array.from(store.entries())) {
      if (rec.resetAt <= now) store.delete(key);
    }
  };
  // Only run in server environment
  if (typeof setInterval !== "undefined") {
    setInterval(cleanup, 5 * 60 * 1000);
  }
}

export interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
}

export function checkRateLimit(
  key: string,
  opts: RateLimitOptions
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const rec = store.get(key);

  if (!rec || rec.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (rec.count >= opts.maxRequests) {
    return { allowed: false, retryAfterMs: rec.resetAt - now };
  }

  rec.count += 1;
  return { allowed: true, retryAfterMs: 0 };
}
