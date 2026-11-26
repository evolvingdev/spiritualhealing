import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from './app-config.js';

const VALID_ENV = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgres://app_runtime:not-a-real-secret@db.example.test:6543/postgres',
  SUPABASE_URL: 'https://project-ref.supabase.co/',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example-key',
};

describe('loadConfig', () => {
  it('derives the Supabase issuer and JWKS URL and applies defaults', () => {
    const config = loadConfig(VALID_ENV);
    expect(config.supabase).toEqual({
      authUrl: 'https://project-ref.supabase.co/auth/v1',
      issuer: 'https://project-ref.supabase.co/auth/v1',
      jwksUrl: 'https://project-ref.supabase.co/auth/v1/.well-known/jwks.json',
      publishableKey: 'sb_publishable_example-key',
    });
    expect(config.port).toBe(3001);
    expect(config.trustProxyHops).toBe(0);
  });

  it('fails fast and names every missing variable', () => {
    expect(() => loadConfig({})).toThrow(ConfigError);
    expect(() => loadConfig({})).toThrow(
      /NODE_ENV[\s\S]*DATABASE_URL[\s\S]*SUPABASE_URL[\s\S]*SUPABASE_PUBLISHABLE_KEY/,
    );
  });

  it('never includes configuration values in the error, because they hold credentials', () => {
    const env = { ...VALID_ENV, DATABASE_POOL_MAX: 'not-a-number' };
    const error = captureError(() => loadConfig(env));
    expect(error.message).toContain('DATABASE_POOL_MAX');
    expect(error.message).not.toContain('not-a-real-secret');
  });

  it('rejects a non-https Supabase URL in production', () => {
    expect(() => loadConfig({ ...VALID_ENV, SUPABASE_URL: 'http://localhost:54321' })).toThrow(
      /SUPABASE_URL: must use https in production/,
    );
  });

  it('allows a local http Supabase URL outside production', () => {
    const config = loadConfig({
      ...VALID_ENV,
      NODE_ENV: 'development',
      SUPABASE_URL: 'http://127.0.0.1:54321',
    });
    expect(config.supabase.issuer).toBe('http://127.0.0.1:54321/auth/v1');
  });

  it('rejects a publishable key with unexpected characters', () => {
    expect(() => loadConfig({ ...VALID_ENV, SUPABASE_PUBLISHABLE_KEY: 'key with spaces' })).toThrow(
      /SUPABASE_PUBLISHABLE_KEY/,
    );
  });

  it('rejects a non-Postgres database URL', () => {
    expect(() => loadConfig({ ...VALID_ENV, DATABASE_URL: 'mysql://db.example.test/app' })).toThrow(
      /DATABASE_URL/,
    );
  });
});

function captureError(action: () => unknown): Error {
  try {
    action();
  } catch (error) {
    if (error instanceof Error) {
      return error;
    }
  }
  throw new Error('Expected the action to throw an Error');
}
