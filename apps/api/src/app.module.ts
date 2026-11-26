import { Module, type DynamicModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import type { DestinationStream } from 'pino';
import { AccountsModule } from './accounts/accounts.module.js';
import { AdminModule } from './admin/admin.module.js';
import { AccountRateLimitGuard } from './auth/account-rate-limit.guard.js';
import { AuthGuard } from './auth/auth.guard.js';
import { AuthModule } from './auth/auth.module.js';
import { PermissionsGuard } from './auth/permissions.guard.js';
import { GlobalExceptionFilter } from './common/errors/global-exception.filter.js';
import { HandlerTimeoutInterceptor } from './common/http/handler-timeout.interceptor.js';
import { createLoggerParams } from './common/logging/logger-params.js';
import { ClockModule } from './common/time/clock.js';
import type { AppConfig } from './config/app-config.js';
import { AppConfigModule } from './config/app-config.module.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './health/health.module.js';
import { SupabaseAuthModule } from './infrastructure/supabase-auth/supabase-auth.module.js';

/** Per-IP baseline. Stricter, account-keyed limits are added on sensitive write endpoints. */
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 120;

export interface AppModuleOptions {
  readonly config: AppConfig;
  /** Where logs go. Defaults to stdout; tests pass a capturing stream. */
  readonly logDestination?: DestinationStream;
}

@Module({})
export class AppModule {
  static register({ config, logDestination }: AppModuleOptions): DynamicModule {
    return {
      module: AppModule,
      imports: [
        AppConfigModule.register(config),
        LoggerModule.forRoot(createLoggerParams(config, logDestination)),
        ThrottlerModule.forRoot([{ ttl: RATE_LIMIT_WINDOW_MS, limit: RATE_LIMIT_MAX_REQUESTS }]),
        ClockModule,
        DatabaseModule,
        SupabaseAuthModule,
        AuthModule,
        AccountsModule,
        AdminModule,
        HealthModule,
      ],
      providers: [
        { provide: APP_FILTER, useClass: GlobalExceptionFilter },
        // Order matters: throttle by IP, authenticate, authorize, then throttle by account.
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_GUARD, useExisting: AuthGuard },
        { provide: APP_GUARD, useExisting: PermissionsGuard },
        { provide: APP_GUARD, useClass: AccountRateLimitGuard },
        { provide: APP_INTERCEPTOR, useClass: HandlerTimeoutInterceptor },
      ],
    };
  }
}
