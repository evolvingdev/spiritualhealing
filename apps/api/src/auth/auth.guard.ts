import {
  Inject,
  Injectable,
  Logger,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  evaluateSession,
  findPendingPolicies,
  isActivityRecordingDue,
  type PolicyVersions,
} from '@spiritualhealing/domain';
import { CURRENT_POLICY_VERSIONS } from '@spiritualhealing/shared';
import { AuthenticationError } from '../common/errors/app-error.js';
import { getOrAssignCorrelationId } from '../common/http/request-context.js';
import { CLOCK, type Clock } from '../common/time/clock.js';
import { SUPABASE_AUTH, type SupabaseAuth } from '../infrastructure/supabase-auth/supabase-auth.js';
import { AccessTokenVerifier } from './access-token-verifier.js';
import type { AuthContext, AuthenticatedRequest } from './auth-context.js';
import { extractBearerToken } from './bearer-token.js';
import { isPublicRoute } from './decorators.js';
import { SessionStateRepository } from './session-state.repository.js';

const CURRENT_VERSIONS: PolicyVersions = CURRENT_POLICY_VERSIONS;

/**
 * Global guard: every route is authenticated unless marked `@Public()`. All failures produce the
 * same 401 so callers cannot tell a bad token from a revoked or timed-out session; the reason is
 * logged. Also enforces the idle and absolute session timeouts (ADR 0022).
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AccessTokenVerifier) private readonly verifier: AccessTokenVerifier,
    @Inject(SessionStateRepository) private readonly sessions: SessionStateRepository,
    @Inject(SUPABASE_AUTH) private readonly supabaseAuth: SupabaseAuth,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (isPublicRoute(this.reflector, context)) {
      return true;
    }
    const http = context.switchToHttp();
    const request = http.getRequest<AuthenticatedRequest>();
    try {
      request.auth = await this.authenticate(request);
    } catch (error) {
      if (error instanceof AuthenticationError) {
        this.logger.warn(
          {
            event: 'auth.rejected',
            reason: error.reason,
            correlationId: getOrAssignCorrelationId(request, http.getResponse()),
          },
          'Request authentication rejected',
        );
      }
      throw error;
    }
    return true;
  }

  private async authenticate(request: AuthenticatedRequest): Promise<AuthContext> {
    const accessToken = extractBearerToken(request.headers.authorization);
    if (accessToken === null) {
      throw new AuthenticationError('missing_or_malformed_token');
    }
    const verified = await this.verifier.verify(accessToken);
    if (verified === null) {
      throw new AuthenticationError('invalid_token');
    }
    const state = await this.sessions.findSessionState(verified.sessionId, verified.userId);
    if (state === null) {
      throw new AuthenticationError('inactive_session');
    }

    const now = this.clock.now();
    const status = evaluateSession(state.roles, state.timeline, now);
    if (status !== 'active') {
      await this.endTimedOutSession(accessToken);
      throw new AuthenticationError(status);
    }
    if (isActivityRecordingDue(state.timeline.lastActivityAt, now)) {
      await this.sessions.recordActivity(verified.sessionId, now);
    }

    return {
      ...verified,
      roles: state.roles,
      hasVerifiedMfaFactor: state.hasVerifiedMfaFactor,
      pendingPolicies: findPendingPolicies(state.acceptedPolicies, CURRENT_VERSIONS),
      accessToken,
    };
  }

  /**
   * Also ends the session at Supabase, so its refresh token stops working. Best effort: the 401
   * stands either way, because this guard rejects the session on every later request too.
   */
  private async endTimedOutSession(accessToken: string): Promise<void> {
    try {
      await this.supabaseAuth.signOut(accessToken, 'local');
    } catch (error) {
      this.logger.warn({ event: 'auth.timeout_sign_out_failed', err: error }, 'Sign-out failed');
    }
  }
}
