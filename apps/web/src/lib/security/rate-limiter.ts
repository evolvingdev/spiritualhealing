export interface RateLimit {
  readonly limit: number;
  readonly windowMs: number;
}

interface Window {
  readonly startedAt: number;
  count: number;
}

/** Bounds memory under a flood of distinct keys; the oldest windows are evicted first. */
const MAX_TRACKED_KEYS = 50_000;

/**
 * Fixed-window counter in this server's memory. Supabase sees every request from this one server
 * IP, so the web server limits auth attempts per client IP and per email itself. Per instance only:
 * running several web instances needs a shared store (docs/architecture.md, Scaling).
 */
export class RateLimiter {
  private readonly windows = new Map<string, Window>();

  constructor(private readonly now: () => number = Date.now) {}

  /** Counts an attempt; false when the key has exhausted its limit for the current window. */
  tryConsume(key: string, { limit, windowMs }: RateLimit): boolean {
    const now = this.now();
    const current = this.windows.get(key);
    if (current === undefined || now - current.startedAt >= windowMs) {
      this.windows.delete(key);
      this.windows.set(key, { startedAt: now, count: 1 });
      this.evictOverflow();
      return true;
    }
    current.count += 1;
    return current.count <= limit;
  }

  private evictOverflow(): void {
    while (this.windows.size > MAX_TRACKED_KEYS) {
      const oldest = this.windows.keys().next();
      if (oldest.done === true) {
        return;
      }
      this.windows.delete(oldest.value);
    }
  }
}
