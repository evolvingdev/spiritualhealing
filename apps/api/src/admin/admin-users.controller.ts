import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { parseUserId, type UserId } from '@spiritualhealing/domain';
import {
  userLookupRequestSchema,
  type ManagedUserResponse,
  type UserLookupRequest,
} from '@spiritualhealing/shared';
import { ZodValidationPipe } from 'nestjs-zod';
import { ACCOUNT_RATE_LIMITS } from '../auth/account-rate-limit.guard.js';
import type { AuthContext } from '../auth/auth-context.js';
import { AccountRateLimit, CurrentAuth, RequirePermission } from '../auth/decorators.js';
import { ValidationError } from '../common/errors/app-error.js';
import { CorrelationId } from '../common/http/correlation-id.decorator.js';
import { AdminUsersService } from './admin-users.service.js';

/** Admin-only role management (permission `roles:manage`: admins after MFA). Every call is audited. */
@Controller('admin/users')
@RequirePermission('roles:manage')
export class AdminUsersController {
  constructor(@Inject(AdminUsersService) private readonly users: AdminUsersService) {}

  /** POST so the email travels in the body, never in a URL or access log. */
  @Post('lookup')
  @HttpCode(HttpStatus.OK)
  @AccountRateLimit(ACCOUNT_RATE_LIMITS.standard)
  lookUp(
    @CurrentAuth() admin: AuthContext,
    @Body(new ZodValidationPipe(userLookupRequestSchema)) body: UserLookupRequest,
    @CorrelationId() correlationId: string,
  ): Promise<ManagedUserResponse> {
    return this.users.lookUpByEmail(admin, body.email, correlationId);
  }

  @Put(':userId/roles/practitioner')
  @AccountRateLimit(ACCOUNT_RATE_LIMITS.standard)
  grantPractitioner(
    @CurrentAuth() admin: AuthContext,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @CorrelationId() correlationId: string,
  ): Promise<ManagedUserResponse> {
    return this.users.grantPractitioner(admin, toUserId(userId), correlationId);
  }

  @Delete(':userId/roles/practitioner')
  @AccountRateLimit(ACCOUNT_RATE_LIMITS.standard)
  revokePractitioner(
    @CurrentAuth() admin: AuthContext,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @CorrelationId() correlationId: string,
  ): Promise<ManagedUserResponse> {
    return this.users.revokePractitioner(admin, toUserId(userId), correlationId);
  }
}

function toUserId(value: string): UserId {
  const userId = parseUserId(value);
  if (userId === null) {
    throw new ValidationError('userId is not a UUID');
  }
  return userId;
}
