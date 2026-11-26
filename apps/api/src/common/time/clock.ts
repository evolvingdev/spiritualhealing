import { Global, Module } from '@nestjs/common';

/** The current time, injected so tests can control it (CLAUDE.md: control time in tests). */
export interface Clock {
  now(): Date;
}

export const CLOCK = Symbol('CLOCK');

const systemClock: Clock = { now: () => new Date() };

@Global()
@Module({
  providers: [{ provide: CLOCK, useValue: systemClock }],
  exports: [CLOCK],
})
export class ClockModule {}
