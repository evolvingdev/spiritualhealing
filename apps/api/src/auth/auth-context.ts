import type {
  AuthenticationMethod,
  AuthenticatorAssuranceLevel,
  PolicyKind,
  Role,
  SessionId,
  UserId,
} from '@spiritualhealing/domain';
import type { Request } from 'express';

/** Who is calling, established by `AuthGuard` from a verified token and our own tables. */
export interface AuthContext {
  readonly userId: UserId;
  readonly sessionId: SessionId;
  readonly aal: AuthenticatorAssuranceLevel;
  readonly authenticationMethods: readonly AuthenticationMethod[];
  readonly roles: readonly Role[];
  /** The caller has set up an authenticator, which makes MFA required for them too. */
  readonly hasVerifiedMfaFactor: boolean;
  /** Policies whose current version the caller has not accepted. */
  readonly pendingPolicies: readonly PolicyKind[];
  /**
   * The caller's own access token, forwarded to Supabase for changes made on their behalf.
   * Never logged (the logger redacts `accessToken`) and never returned in a response.
   */
  readonly accessToken: string;
}

export interface AuthenticatedRequest extends Request {
  auth?: AuthContext;
}
