import {
  Inject,
  Injectable,
  Logger,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { authorize, hasRecentAuthentication, type AccessPolicy } from '@spiritualhealing/domain';
import { AuthorizationError } from '../common/errors/app-error.js';
import { CLOCK, type Clock } from '../common/time/clock.js';
import type { AuthenticatedRequest } from './auth-context.js';
import {
  getRequiredPermission,
  isPublicRoute,
  requiresRecentAuthentication,
} from './decorators.js';

/** The access policy in force. A provider so integration tests can exercise permissions production lacks. */
export const ACCESS_POLICY_PROVIDER = Symbol('ACCESS_POLICY_PROVIDER');

/**
 * Global guard, after `AuthGuard`: deny by default. A route without `@RequirePermission()` is
 * refused here too, as a backstop to the boot-time route coverage check. Routes marked
 * `@RequireRecentAuthentication()` additionally need a sign-in within the last five minutes.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(ACCESS_POLICY_PROVIDER) private readonly policy: AccessPolicy,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    if (isPublicRoute(this.reflector, context)) {
      return true;
    }
    const permission = getRequiredPermission(this.reflector, context);
    const auth = context.switchToHttp().getRequest<AuthenticatedRequest>().auth;
    if (permission === undefined || auth === undefined) {
      this.logger.error(
        { event: 'authz.undeclared', handler: context.getHandler().name },
        'Route reached PermissionsGuard without a declared permission or authentication',
      );
      throw new AuthorizationError('forbidden', 'Route has no declared permission');
    }

    const decision = authorize(this.policy, {
      roles: auth.roles,
      aal: auth.aal,
      hasVerifiedMfaFactor: auth.hasVerifiedMfaFactor,
      hasPendingPolicies: auth.pendingPolicies.length > 0,
      permission,
    });
    if (decision !== 'allowed') {
      this.logger.warn(
        { event: 'authz.denied', decision, permission, userId: auth.userId },
        'Permission denied',
      );
      throw new AuthorizationError(decision, `Permission ${permission} denied: ${decision}`);
    }

    if (
      requiresRecentAuthentication(this.reflector, context) &&
      !hasRecentAuthentication({
        roles: auth.roles,
        hasVerifiedMfaFactor: auth.hasVerifiedMfaFactor,
        methods: auth.authenticationMethods,
        now: this.clock.now(),
      })
    ) {
      this.logger.log(
        { event: 'authz.reauthentication_required', permission, userId: auth.userId },
        'Recent sign-in required',
      );
      throw new AuthorizationError('reauthentication_required', 'No sign-in within the window');
    }
    return true;
  }
}
