import { randomUUID } from 'node:crypto';
import { base64url, errors, type JWTVerifyGetKey } from 'jose';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  createTokenSigner,
  createUntrustedSigner,
  TEST_SUPABASE_URL,
  type AccessTokenOptions,
  type TokenSigner,
} from '../../test/support/token-signer.js';
import { ServiceUnavailableError } from '../common/errors/app-error.js';
import { loadConfig } from '../config/app-config.js';
import { AccessTokenVerifier } from './access-token-verifier.js';

const config = loadConfig({
  NODE_ENV: 'test',
  DATABASE_URL: 'postgres://unused@localhost/unused',
  SUPABASE_URL: TEST_SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test-key',
});

function unsignedToken(header: object, payload: object): string {
  const encode = (value: object): string => base64url.encode(JSON.stringify(value));
  return `${encode(header)}.${encode(payload)}.`;
}

describe('AccessTokenVerifier', () => {
  let signer: TokenSigner;
  let verifier: AccessTokenVerifier;
  const identity = { userId: randomUUID(), sessionId: randomUUID() };

  beforeAll(async () => {
    signer = await createTokenSigner();
    verifier = new AccessTokenVerifier(signer.keyResolver, config);
  });

  const sign = (options: Partial<AccessTokenOptions> = {}): Promise<string> =>
    signer.signAccessToken({ ...identity, ...options });

  it('returns the identity, assurance level and sign-in methods from a valid token', async () => {
    const signedInAt = 1_795_000_000;
    const token = await sign({
      aal: 'aal2',
      amr: [
        { method: 'totp', timestamp: signedInAt + 30 },
        { method: 'password', timestamp: signedInAt },
      ],
    });
    await expect(verifier.verify(token)).resolves.toEqual({
      ...identity,
      aal: 'aal2',
      authenticationMethods: [
        { method: 'totp', authenticatedAt: new Date((signedInAt + 30) * 1000) },
        { method: 'password', authenticatedAt: new Date(signedInAt * 1000) },
      ],
    });
  });

  it('treats a token without amr as having no recent sign-in methods', async () => {
    const token = await sign({ extraClaims: { amr: undefined } });
    await expect(verifier.verify(token)).resolves.toMatchObject({ authenticationMethods: [] });
  });

  it.each<[string, Partial<AccessTokenOptions>]>([
    ['an expired token', { expiresInSeconds: -60 }],
    ['the wrong issuer', { issuer: 'https://attacker.example.test/auth/v1' }],
    ['the wrong audience', { audience: 'anon' }],
    ['a non-UUID subject', { userId: 'not-a-uuid' }],
    ['a non-UUID session', { sessionId: 'not-a-uuid' }],
    ['an anonymous user', { extraClaims: { is_anonymous: true } }],
    ['an unknown assurance level', { extraClaims: { aal: 'aal3' } }],
    ['a missing session_id', { extraClaims: { session_id: undefined } }],
    ['a malformed amr claim', { extraClaims: { amr: [{ method: 'password' }] } }],
    [
      'an oversized amr claim',
      { extraClaims: { amr: Array.from({ length: 17 }, () => ({ method: 'otp', timestamp: 1 })) } },
    ],
  ])('rejects %s', async (_case, options) => {
    await expect(verifier.verify(await sign(options))).resolves.toBeNull();
  });

  it('rejects a token signed by a key Supabase does not publish', async () => {
    const forge = await createUntrustedSigner();
    await expect(verifier.verify(await forge(identity))).resolves.toBeNull();
  });

  it('rejects an unsigned (alg: none) token', async () => {
    const token = unsignedToken(
      { alg: 'none', typ: 'JWT' },
      { sub: identity.userId, session_id: identity.sessionId, aal: 'aal2' },
    );
    await expect(verifier.verify(token)).resolves.toBeNull();
  });

  it('rejects a symmetric (HS256) token', async () => {
    const token = unsignedToken({ alg: 'HS256', typ: 'JWT' }, { sub: identity.userId });
    await expect(verifier.verify(`${token}c2lnbmF0dXJl`)).resolves.toBeNull();
  });

  it('rejects garbage', async () => {
    await expect(verifier.verify('a.b.c')).resolves.toBeNull();
  });

  it('ignores roles in user_metadata and app_metadata', async () => {
    const token = await sign({
      extraClaims: { user_metadata: { role: 'admin' }, app_metadata: { roles: ['admin'] } },
    });
    await expect(verifier.verify(token)).resolves.toMatchObject({ ...identity, aal: 'aal1' });
  });

  it('reports an outage, not an invalid token, when the signing keys cannot be fetched', async () => {
    const unreachable: JWTVerifyGetKey = () => {
      throw new errors.JWKSTimeout();
    };
    const offlineVerifier = new AccessTokenVerifier(unreachable, config);
    await expect(offlineVerifier.verify(await sign())).rejects.toBeInstanceOf(
      ServiceUnavailableError,
    );
  });
});
