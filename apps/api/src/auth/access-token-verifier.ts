import { Inject, Injectable } from '@nestjs/common';
import {
  parseSessionId,
  parseUserId,
  type AuthenticationMethod,
  type AuthenticatorAssuranceLevel,
  type SessionId,
  type UserId,
} from '@spiritualhealing/domain';
import { errors, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { z } from 'zod';
import { ServiceUnavailableError } from '../common/errors/app-error.js';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';

/** Resolves Supabase's signing keys. Production uses the remote JWKS; tests inject a local set. */
export const JWKS_KEY_RESOLVER = Symbol('JWKS_KEY_RESOLVER');

/** Supabase signs access tokens with asymmetric keys; symmetric and `none` algorithms are refused. */
const ACCEPTED_ALGORITHMS = ['ES256', 'RS256'];
const SUPABASE_ACCESS_TOKEN_AUDIENCE = 'authenticated';
const CLOCK_TOLERANCE_SECONDS = 5;
const MILLISECONDS_PER_SECOND = 1000;
/** Supabase lists one entry per method used; anything longer is not a genuine token. */
const MAX_AMR_ENTRIES = 16;

/** jose error codes meaning "this token is not acceptable", as opposed to "we could not check it". */
const INVALID_TOKEN_ERROR_CODES: ReadonlySet<string> = new Set([
  errors.JWTExpired.code,
  errors.JWTClaimValidationFailed.code,
  errors.JWTInvalid.code,
  errors.JWSInvalid.code,
  errors.JWSSignatureVerificationFailed.code,
  errors.JOSEAlgNotAllowed.code,
  errors.JOSENotSupported.code,
  errors.JWKSNoMatchingKey.code,
  errors.JWKSMultipleMatchingKeys.code,
]);

/**
 * Only the claims we rely on. Roles are deliberately absent: `user_metadata` is user-editable and
 * `app_metadata` is not our source of truth (ADR 0006).
 */
const accessTokenClaimsSchema = z.object({
  sub: z.string(),
  session_id: z.string(),
  aal: z.enum(['aal1', 'aal2']),
  is_anonymous: z.boolean().optional(),
  /** How and when the session authenticated; drives the recent-sign-in rule (ADR 0022). */
  amr: z
    .array(z.object({ method: z.string().max(64), timestamp: z.number().int().positive() }))
    .max(MAX_AMR_ENTRIES)
    .default([]),
});

export interface VerifiedAccessToken {
  readonly userId: UserId;
  readonly sessionId: SessionId;
  readonly aal: AuthenticatorAssuranceLevel;
  readonly authenticationMethods: readonly AuthenticationMethod[];
}

@Injectable()
export class AccessTokenVerifier {
  constructor(
    @Inject(JWKS_KEY_RESOLVER) private readonly resolveKey: JWTVerifyGetKey,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  /**
   * Returns the verified identity, or `null` if the token is not acceptable for any reason.
   * Throws `ServiceUnavailableError` only when the keys could not be fetched.
   */
  async verify(token: string): Promise<VerifiedAccessToken | null> {
    let payload: unknown;
    try {
      ({ payload } = await jwtVerify(token, this.resolveKey, {
        issuer: this.config.supabase.issuer,
        audience: SUPABASE_ACCESS_TOKEN_AUDIENCE,
        algorithms: ACCEPTED_ALGORITHMS,
        clockTolerance: CLOCK_TOLERANCE_SECONDS,
        requiredClaims: ['exp', 'sub'],
      }));
    } catch (error) {
      if (isInvalidTokenError(error)) {
        return null;
      }
      throw new ServiceUnavailableError('Could not verify the access token', { cause: error });
    }
    return toVerifiedAccessToken(payload);
  }
}

function isInvalidTokenError(error: unknown): boolean {
  return error instanceof errors.JOSEError && INVALID_TOKEN_ERROR_CODES.has(error.code);
}

function toVerifiedAccessToken(payload: unknown): VerifiedAccessToken | null {
  const claims = accessTokenClaimsSchema.safeParse(payload);
  if (!claims.success || claims.data.is_anonymous === true) {
    return null;
  }
  const userId = parseUserId(claims.data.sub);
  const sessionId = parseSessionId(claims.data.session_id);
  if (userId === null || sessionId === null) {
    return null;
  }
  return {
    userId,
    sessionId,
    aal: claims.data.aal,
    authenticationMethods: claims.data.amr.map(({ method, timestamp }) => ({
      method,
      authenticatedAt: new Date(timestamp * MILLISECONDS_PER_SECOND),
    })),
  };
}
