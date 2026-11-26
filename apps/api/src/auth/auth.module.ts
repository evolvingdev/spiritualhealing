import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { ACCESS_POLICY } from '@spiritualhealing/domain';
import { createRemoteJWKSet, type JWTVerifyGetKey } from 'jose';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import { AccessTokenVerifier, JWKS_KEY_RESOLVER } from './access-token-verifier.js';
import { AuthGuard } from './auth.guard.js';
import { ACCESS_POLICY_PROVIDER, PermissionsGuard } from './permissions.guard.js';
import { RouteCoverageCheck } from './route-coverage.check.js';
import { SessionStateRepository } from './session-state.repository.js';

const JWKS_FETCH_TIMEOUT_MS = 5_000;
/** Minimum gap between JWKS refetches when an unknown key ID appears (limits refetch abuse). */
const JWKS_COOLDOWN_MS = 30_000;
/** How long fetched keys are trusted before a refetch, so key rotation is picked up. */
const JWKS_CACHE_MAX_AGE_MS = 10 * 60_000;

@Module({
  imports: [DiscoveryModule],
  providers: [
    {
      provide: JWKS_KEY_RESOLVER,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig): JWTVerifyGetKey =>
        createRemoteJWKSet(new URL(config.supabase.jwksUrl), {
          timeoutDuration: JWKS_FETCH_TIMEOUT_MS,
          cooldownDuration: JWKS_COOLDOWN_MS,
          cacheMaxAge: JWKS_CACHE_MAX_AGE_MS,
        }),
    },
    { provide: ACCESS_POLICY_PROVIDER, useValue: ACCESS_POLICY },
    AccessTokenVerifier,
    SessionStateRepository,
    AuthGuard,
    PermissionsGuard,
    RouteCoverageCheck,
  ],
  exports: [AuthGuard, PermissionsGuard],
})
export class AuthModule {}
