export const MINUTE_MS = 60_000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

/** Whole milliseconds between two instants. Instants are UTC, so DST never affects the result. */
export function elapsedMs(from: Date, to: Date): number {
  return to.getTime() - from.getTime();
}
