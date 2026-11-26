import { isIP } from 'node:net';

const UNKNOWN_CLIENT = 'unknown';

/**
 * The client IP as reported by the load balancer in front of this server: the right-most entry of
 * X-Forwarded-For, which the ALB appends and a client cannot forge. Locally there is no proxy.
 */
export function readClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  const lastHop = forwarded?.split(',').at(-1)?.trim();
  if (lastHop !== undefined && isIP(lastHop) !== 0) {
    return lastHop;
  }
  const realIp = headers.get('x-real-ip')?.trim();
  return realIp !== undefined && isIP(realIp) !== 0 ? realIp : UNKNOWN_CLIENT;
}
