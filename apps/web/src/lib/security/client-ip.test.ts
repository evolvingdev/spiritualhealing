import { describe, expect, it } from 'vitest';
import { readClientIp } from './client-ip';

describe('readClientIp', () => {
  it('takes the right-most X-Forwarded-For entry, which the load balancer appended', () => {
    const headers = new Headers({ 'x-forwarded-for': '6.6.6.6, 203.0.113.9' });
    expect(readClientIp(headers)).toBe('203.0.113.9');
  });

  it('ignores a forged value that is not an IP address', () => {
    const headers = new Headers({ 'x-forwarded-for': 'not-an-ip' });
    expect(readClientIp(headers)).toBe('unknown');
  });

  it('accepts IPv6', () => {
    expect(readClientIp(new Headers({ 'x-forwarded-for': '2001:db8::1' }))).toBe('2001:db8::1');
  });

  it('reports an unknown client when there is no proxy header', () => {
    expect(readClientIp(new Headers())).toBe('unknown');
  });
});
