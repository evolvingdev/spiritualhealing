import { Writable } from 'node:stream';
import type { Type } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import type { AccessPolicy } from '@spiritualhealing/domain';
import { Logger } from 'nestjs-pino';
import { AppModule } from '../../src/app.module.js';
import { JWKS_KEY_RESOLVER } from '../../src/auth/access-token-verifier.js';
import { ACCESS_POLICY_PROVIDER } from '../../src/auth/permissions.guard.js';
import { configureApp } from '../../src/common/http/configure-app.js';
import { CLOCK } from '../../src/common/time/clock.js';
import { loadConfig } from '../../src/config/app-config.js';
import { SUPABASE_AUTH } from '../../src/infrastructure/supabase-auth/supabase-auth.js';
import { FakeSupabaseAuth } from './fake-supabase-auth.js';
import { TestClock } from './test-clock.js';
import type { TokenSigner } from './token-signer.js';
import { TEST_SUPABASE_URL } from './token-signer.js';

export interface TestAppOptions {
  readonly runtimeDatabaseUrl: string;
  readonly signer: TokenSigner;
  /** Replaces the production access policy, to exercise permissions production does not have yet. */
  readonly accessPolicy?: AccessPolicy<string>;
  /** Extra controllers mounted for a single test (e.g. to check the route coverage rule). */
  readonly extraControllers?: readonly Type[];
}

export interface TestApp {
  readonly app: NestExpressApplication;
  readonly clock: TestClock;
  readonly supabaseAuth: FakeSupabaseAuth;
  /** Everything the app logged, one JSON line per entry. */
  readonly logs: () => string;
  close(): Promise<void>;
}

/**
 * Builds the real application (same module, same HTTP setup) with only the external boundaries
 * swapped: Supabase's signing keys, Supabase Auth's user API, and the clock.
 */
export async function createTestApp(options: TestAppOptions): Promise<TestApp> {
  const config = loadConfig({
    NODE_ENV: 'test',
    LOG_LEVEL: 'info',
    DATABASE_URL: options.runtimeDatabaseUrl,
    SUPABASE_URL: TEST_SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test-key',
  });
  const logLines: string[] = [];
  const logDestination = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      logLines.push(chunk.toString('utf8'));
      callback();
    },
  });
  const clock = new TestClock();
  const supabaseAuth = new FakeSupabaseAuth();

  let builder = Test.createTestingModule({
    imports: [AppModule.register({ config, logDestination })],
    controllers: [...(options.extraControllers ?? [])],
  })
    .overrideProvider(JWKS_KEY_RESOLVER)
    .useValue(options.signer.keyResolver)
    .overrideProvider(SUPABASE_AUTH)
    .useValue(supabaseAuth)
    .overrideProvider(CLOCK)
    .useValue(clock);
  if (options.accessPolicy !== undefined) {
    builder = builder.overrideProvider(ACCESS_POLICY_PROVIDER).useValue(options.accessPolicy);
  }
  const moduleRef = await builder.compile();

  // Nest declares its options as a class but documents passing a plain object literal.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-class-instance-assignment
  const app = moduleRef.createNestApplication<NestExpressApplication>({
    bodyParser: false,
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  configureApp(app, config);
  try {
    await app.init();
  } catch (error) {
    await app.close();
    throw error;
  }

  return { app, clock, supabaseAuth, logs: () => logLines.join(''), close: () => app.close() };
}
