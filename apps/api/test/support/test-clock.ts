import type { Clock } from '../../src/common/time/clock.js';

/**
 * Real time plus a controllable offset. Tokens are still signed and verified against real time;
 * advancing the clock moves only the API's session-timeout and recent-sign-in decisions.
 */
export class TestClock implements Clock {
  private offsetMs = 0;

  now(): Date {
    return new Date(Date.now() + this.offsetMs);
  }

  advanceBy(ms: number): void {
    this.offsetMs += ms;
  }

  reset(): void {
    this.offsetMs = 0;
  }
}
