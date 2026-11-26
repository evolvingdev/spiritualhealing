import { createParamDecorator, SetMetadata, type ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { Permission } from '@spiritualhealing/domain';
import type { AuthContext, AuthenticatedRequest } from './auth-context.js';

export const IS_PUBLIC_KEY = 'auth:isPublic';
export const REQUIRED_PERMISSION_KEY = 'auth:requiredPermission';
export const REQUIRES_RECENT_AUTHENTICATION_KEY = 'auth:requiresRecentAuthentication';
export const ACCOUNT_RATE_LIMIT_KEY = 'auth:accountRateLimit';

/** Opts a route (or controller) out of authentication. Every use should be obvious in review. */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);

/** Declares the permission a route needs. A route with neither this nor `@Public()` won't boot. */
export const RequirePermission = (permission: Permission): MethodDecorator & ClassDecorator =>
  SetMetadata(REQUIRED_PERMISSION_KEY, permission);

/**
 * The caller must have signed in within the last five minutes (with TOTP for privileged roles)
 * before this sensitive change is allowed (CLAUDE.md: re-authenticate before sensitive actions).
 */
export const RequireRecentAuthentication = (): MethodDecorator =>
  SetMetadata(REQUIRES_RECENT_AUTHENTICATION_KEY, true);

export interface AccountRateLimitOptions {
  /** Requests allowed per caller within the window. */
  readonly limit: number;
  readonly windowMs: number;
}

/** Limits a route per authenticated account, on top of the global per-IP limit. */
export const AccountRateLimit = (options: AccountRateLimitOptions): MethodDecorator =>
  SetMetadata(ACCOUNT_RATE_LIMIT_KEY, options);

export const CurrentAuth = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthContext => {
    const auth = context.switchToHttp().getRequest<AuthenticatedRequest>().auth;
    if (auth === undefined) {
      throw new Error('@CurrentAuth() used on a route that AuthGuard did not authenticate');
    }
    return auth;
  },
);

export function isPublicRoute(reflector: Reflector, context: ExecutionContext): boolean {
  return (
    reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) === true
  );
}

export function getRequiredPermission(
  reflector: Reflector,
  context: ExecutionContext,
): Permission | undefined {
  return reflector.getAllAndOverride<Permission | undefined>(REQUIRED_PERMISSION_KEY, [
    context.getHandler(),
    context.getClass(),
  ]);
}

export function requiresRecentAuthentication(
  reflector: Reflector,
  context: ExecutionContext,
): boolean {
  return (
    reflector.get<boolean | undefined>(REQUIRES_RECENT_AUTHENTICATION_KEY, context.getHandler()) ===
    true
  );
}

export function getAccountRateLimit(
  reflector: Reflector,
  context: ExecutionContext,
): AccountRateLimitOptions | undefined {
  return reflector.get<AccountRateLimitOptions | undefined>(
    ACCOUNT_RATE_LIMIT_KEY,
    context.getHandler(),
  );
}
