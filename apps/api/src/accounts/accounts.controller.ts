import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import {
  changeEmailRequestSchema,
  changePasswordRequestSchema,
  completeOnboardingRequestSchema,
  type ChangeEmailRequest,
  type ChangePasswordRequest,
  type CompleteOnboardingRequest,
  type MeResponse,
} from '@spiritualhealing/shared';
import { ZodValidationPipe } from 'nestjs-zod';
import { ACCOUNT_RATE_LIMITS } from '../auth/account-rate-limit.guard.js';
import type { AuthContext } from '../auth/auth-context.js';
import {
  AccountRateLimit,
  CurrentAuth,
  RequirePermission,
  RequireRecentAuthentication,
} from '../auth/decorators.js';
import { CorrelationId } from '../common/http/correlation-id.decorator.js';
import { AccountsService } from './accounts.service.js';

/** The caller's own account. Every route acts on the authenticated user only, never on an ID from the request. */
@Controller('me')
export class AccountsController {
  constructor(@Inject(AccountsService) private readonly accounts: AccountsService) {}

  @Get()
  @RequirePermission('account:read-self')
  getMe(@CurrentAuth() auth: AuthContext): MeResponse {
    return this.accounts.describeCaller(auth);
  }

  @Post('onboarding')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('account:accept-policies')
  @AccountRateLimit(ACCOUNT_RATE_LIMITS.standard)
  async completeOnboarding(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(completeOnboardingRequestSchema)) body: CompleteOnboardingRequest,
    @CorrelationId() correlationId: string,
  ): Promise<void> {
    await this.accounts.completeOnboarding(auth, body, correlationId);
  }

  /** Also completes a password reset: the recovery link counts as a fresh sign-in. */
  @Put('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('account:manage-credentials')
  @RequireRecentAuthentication()
  @AccountRateLimit(ACCOUNT_RATE_LIMITS.sensitive)
  async changePassword(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(changePasswordRequestSchema)) body: ChangePasswordRequest,
    @CorrelationId() correlationId: string,
  ): Promise<void> {
    await this.accounts.changePassword(auth, body.password, correlationId);
  }

  /** Accepted whether or not the address is taken, so the response never reveals other accounts. */
  @Post('email-change')
  @HttpCode(HttpStatus.ACCEPTED)
  @RequirePermission('account:manage-credentials')
  @RequireRecentAuthentication()
  @AccountRateLimit(ACCOUNT_RATE_LIMITS.sensitive)
  async requestEmailChange(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(changeEmailRequestSchema)) body: ChangeEmailRequest,
    @CorrelationId() correlationId: string,
  ): Promise<void> {
    await this.accounts.requestEmailChange(auth, body.email, correlationId);
  }

  @Delete('mfa-factors/:factorId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('account:manage-credentials')
  @RequireRecentAuthentication()
  @AccountRateLimit(ACCOUNT_RATE_LIMITS.sensitive)
  async removeMfaFactor(
    @CurrentAuth() auth: AuthContext,
    @Param('factorId', new ParseUUIDPipe()) factorId: string,
    @CorrelationId() correlationId: string,
  ): Promise<void> {
    await this.accounts.removeMfaFactor(auth, factorId, correlationId);
  }
}
