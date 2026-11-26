import { describe, expect, it } from 'vitest';
import { RateLimiter } from './rate-limiter';

const LIMIT = { limit: 3, windowMs: 1_000 };

describe('RateLimiter', () => {
  it('allows up to the limit within a window, then refuses', () => {
    const limiter = new RateLimiter(() => 0);
    expect([1, 2, 3, 4].map(() => limiter.tryConsume('key', LIMIT))).toEqual([
      true,
      true,
      true,
      false,
    ]);
  });

  it('starts a fresh window once the previous one has passed', () => {
    let now = 0;
    const limiter = new RateLimiter(() => now);
    for (let attempt = 0; attempt < 4; attempt += 1) {
      limiter.tryConsume('key', LIMIT);
    }
    now = LIMIT.windowMs;
    expect(limiter.tryConsume('key', LIMIT)).toBe(true);
  });

  it('counts keys independently', () => {
    const limiter = new RateLimiter(() => 0);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      limiter.tryConsume('a', LIMIT);
    }
    expect(limiter.tryConsume('a', LIMIT)).toBe(false);
    expect(limiter.tryConsume('b', LIMIT)).toBe(true);
  });
});
