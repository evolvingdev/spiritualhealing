import { Inject, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerStorage } from '@nestjs/throttler';
import type { Response } from 'express';
import { RateLimitError } from '../common/errors/app-error.js';
import type { AuthenticatedRequest } from './auth-context.js';
import { getAccountRateLimit } from './decorators.js';

const THROTTLER_NAME = 'account';
const MILLISECONDS_PER_SECOND = 1000;

/**
 * Global guard, after `PermissionsGuard`: applies `@AccountRateLimit()` per authenticated account
 * and route, so one account cannot hammer a sensitive endpoint from many IP addresses. Uses the
 * throttler's storage (in memory, per instance; see docs/architecture.md before scaling out).
 */
@Injectable()
export class AccountRateLimitGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(ThrottlerStorage) private readonly storage: ThrottlerStorage,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const limit = getAccountRateLimit(this.reflector, context);
    const http = context.switchToHttp();
    const auth = http.getRequest<AuthenticatedRequest>().auth;
    if (limit === undefined || auth === undefined) {
      return true;
    }
    const key = `${context.getClass().name}.${context.getHandler().name}:${auth.userId}`;
    const { isBlocked, timeToBlockExpire } = await this.storage.increment(
      key,
      limit.windowMs,
      limit.limit,
      limit.windowMs,
      THROTTLER_NAME,
    );
    if (isBlocked) {
      http
        .getResponse<Response>()
        .setHeader('Retry-After', String(Math.max(1, Math.ceil(timeToBlockExpire))));
      throw new RateLimitError(`Account rate limit reached for ${key}`);
    }
    return true;
  }
}

export const ACCOUNT_RATE_LIMITS = {
  /** Credential and MFA changes. */
  sensitive: { limit: 5, windowMs: 15 * 60 * MILLISECONDS_PER_SECOND },
  /** Ordinary writes, such as accepting policies or an admin managing roles. */
  standard: { limit: 30, windowMs: 60 * MILLISECONDS_PER_SECOND },
} as const;
