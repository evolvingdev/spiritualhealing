import { randomUUID } from 'node:crypto';
import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  SignJWT,
  type CryptoKey,
  type JWTPayload,
  type JWTVerifyGetKey,
} from 'jose';

export const TEST_SUPABASE_URL = 'https://test-project.supabase.test';
export const TEST_ISSUER = `${TEST_SUPABASE_URL}/auth/v1`;

export interface AuthenticationMethodClaim {
  readonly method: string;
  /** Unix seconds, as Supabase writes them. */
  readonly timestamp: number;
}

export interface AccessTokenOptions {
  readonly userId: string;
  readonly sessionId: string;
  readonly aal?: 'aal1' | 'aal2';
  /** Defaults to a password sign-in at issue time (plus TOTP at aal2), as Supabase issues them. */
  readonly amr?: readonly AuthenticationMethodClaim[];
  readonly issuer?: string;
  readonly audience?: string;
  /** Seconds relative to now; negative values produce an already-expired token. */
  readonly expiresInSeconds?: number;
  readonly extraClaims?: JWTPayload;
}

const DEFAULT_EXPIRY_SECONDS = 300;

/** Stands in for Supabase Auth's signing keys (ADR 0011: mock only at the external boundary). */
export interface TokenSigner {
  /** Key resolver to inject in place of the remote Supabase JWKS. */
  readonly keyResolver: JWTVerifyGetKey;
  signAccessToken(options: AccessTokenOptions): Promise<string>;
}

export async function createTokenSigner(): Promise<TokenSigner> {
  const trusted = await createSigningKey();
  return {
    keyResolver: createLocalJWKSet({ keys: [trusted.publicJwk] }),
    signAccessToken: (options) => signWith(trusted, options),
  };
}

/** A key pair the API does not trust, for forged-token tests. */
export async function createUntrustedSigner(): Promise<
  (options: AccessTokenOptions) => Promise<string>
> {
  const untrusted = await createSigningKey();
  return (options) => signWith(untrusted, options);
}

interface SigningKey {
  readonly keyId: string;
  readonly privateKey: CryptoKey;
  readonly publicJwk: Awaited<ReturnType<typeof exportJWK>>;
}

async function createSigningKey(): Promise<SigningKey> {
  const { privateKey, publicKey } = await generateKeyPair('ES256');
  const keyId = randomUUID();
  const publicJwk = { ...(await exportJWK(publicKey)), kid: keyId, alg: 'ES256', use: 'sig' };
  return { keyId, privateKey, publicJwk };
}

function defaultAmr(aal: 'aal1' | 'aal2', nowSeconds: number): AuthenticationMethodClaim[] {
  const password = { method: 'password', timestamp: nowSeconds };
  return aal === 'aal2' ? [{ method: 'totp', timestamp: nowSeconds }, password] : [password];
}

async function signWith(key: SigningKey, options: AccessTokenOptions): Promise<string> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const aal = options.aal ?? 'aal1';
  return new SignJWT({
    role: 'authenticated',
    session_id: options.sessionId,
    aal,
    amr: options.amr ?? defaultAmr(aal, nowSeconds),
    is_anonymous: false,
    ...options.extraClaims,
  })
    .setProtectedHeader({ alg: 'ES256', kid: key.keyId, typ: 'JWT' })
    .setIssuer(options.issuer ?? TEST_ISSUER)
    .setAudience(options.audience ?? 'authenticated')
    .setSubject(options.userId)
    .setIssuedAt(nowSeconds)
    .setExpirationTime(nowSeconds + (options.expiresInSeconds ?? DEFAULT_EXPIRY_SECONDS))
    .sign(key.privateKey);
}
