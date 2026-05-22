/**
 * Simple in-memory rate limiter.
 * Tracks attempts per key (IP) with a sliding window.
 * No external dependencies (no Redis needed for single-instance).
 */

interface RateLimitEntry {
  count: number;
  resetAt: number; // epoch ms
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 5 * 60 * 1000).unref?.();

interface RateLimitOptions {
  /** Maximum number of requests allowed in the window */
  maxAttempts: number;
  /** Window duration in seconds */
  windowSeconds: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(
  key: string,
  options: RateLimitOptions
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  // No entry or window expired → reset
  if (!entry || now > entry.resetAt) {
    store.set(key, {
      count: 1,
      resetAt: now + options.windowSeconds * 1000,
    });
    return { success: true, remaining: options.maxAttempts - 1, retryAfterSeconds: 0 };
  }

  // Within window
  if (entry.count < options.maxAttempts) {
    entry.count++;
    return {
      success: true,
      remaining: options.maxAttempts - entry.count,
      retryAfterSeconds: 0,
    };
  }

  // Rate limited
  const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
  return { success: false, remaining: 0, retryAfterSeconds };
}
