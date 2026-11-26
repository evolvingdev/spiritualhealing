import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  canRemoveMfaFactor,
  isMfaPending,
  isMfaRequired,
  matchesCurrentVersions,
  type PolicyVersions,
} from '@spiritualhealing/domain';
import {
  CURRENT_POLICY_VERSIONS,
  meResponseSchema,
  type CompleteOnboardingRequest,
  type MeResponse,
} from '@spiritualhealing/shared';
import type { AuthContext } from '../auth/auth-context.js';
import {
  AuthorizationError,
  NotFoundError,
  PolicyVersionOutdatedError,
} from '../common/errors/app-error.js';
import { SUPABASE_AUTH, type SupabaseAuth } from '../infrastructure/supabase-auth/supabase-auth.js';
import { AccountsRepository } from './accounts.repository.js';

const CURRENT_VERSIONS: PolicyVersions = CURRENT_POLICY_VERSIONS;

@Injectable()
export class AccountsService {
  private readonly logger = new Logger(AccountsService.name);

  constructor(
    @Inject(AccountsRepository) private readonly accounts: AccountsRepository,
    @Inject(SUPABASE_AUTH) private readonly supabaseAuth: SupabaseAuth,
  ) {}

  /** Shapes the caller's identity through the strict response schema, so only allowlisted fields leave. */
  describeCaller(auth: AuthContext): MeResponse {
    return meResponseSchema.parse({
      userId: auth.userId,
      roles: [...auth.roles],
      isMfaRequired: isMfaRequired(auth),
      isMfaPending: isMfaPending(auth, auth.aal),
      pendingPolicies: [...auth.pendingPolicies],
    });
  }

  /** The versions must be the current ones: accepting text the user was not shown proves nothing. */
  async completeOnboarding(
    auth: AuthContext,
    { acceptedPolicyVersions }: CompleteOnboardingRequest,
    correlationId: string,
  ): Promise<void> {
    if (!matchesCurrentVersions(acceptedPolicyVersions, CURRENT_VERSIONS)) {
      throw new PolicyVersionOutdatedError();
    }
    await this.accounts.completeOnboarding(auth.userId, acceptedPolicyVersions, correlationId);
  }

  /** Also signs out every other session, so a stolen session cannot outlive the new password. */
  async changePassword(auth: AuthContext, password: string, correlationId: string): Promise<void> {
    await this.supabaseAuth.updatePassword(auth.accessToken, password);
    await this.accounts.recordAuditEvent({
      action: 'account.password_changed',
      actorUserId: auth.userId,
      targetUserId: auth.userId,
      correlationId,
    });
    try {
      await this.supabaseAuth.signOut(auth.accessToken, 'others');
    } catch (error) {
      // The password change itself succeeded; failing the request now would invite a retry.
      this.logger.error(
        { event: 'account.sign_out_others_failed', err: error, correlationId },
        'Could not sign out other sessions after a password change',
      );
    }
  }

  async requestEmailChange(auth: AuthContext, email: string, correlationId: string): Promise<void> {
    await this.supabaseAuth.requestEmailChange(auth.accessToken, email);
    await this.accounts.recordAuditEvent({
      action: 'account.email_change_requested',
      actorUserId: auth.userId,
      targetUserId: auth.userId,
      correlationId,
    });
  }

  async removeMfaFactor(auth: AuthContext, factorId: string, correlationId: string): Promise<void> {
    const factors = await this.supabaseAuth.listMfaFactors(auth.accessToken);
    // Factors are listed with the caller's own token, so another user's factor is never found.
    const factor = factors.find(({ id }) => id === factorId);
    if (factor === undefined) {
      throw new NotFoundError('MFA factor not found for this user');
    }
    const verifiedFactorCount = factors.filter(({ status }) => status === 'verified').length;
    if (
      !canRemoveMfaFactor({ roles: auth.roles, factorStatus: factor.status, verifiedFactorCount })
    ) {
      throw new AuthorizationError('mfa_factor_required', 'Cannot remove the last verified factor');
    }
    await this.supabaseAuth.deleteMfaFactor(auth.accessToken, factorId);
    await this.accounts.recordAuditEvent({
      action: 'account.mfa_factor_removed',
      actorUserId: auth.userId,
      targetUserId: auth.userId,
      correlationId,
      details: { factorId },
    });
  }
}
