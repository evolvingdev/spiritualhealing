import type { Server } from 'node:http';
import { VersioningType } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import type { AppConfig } from '../../config/app-config.js';
import { requestContextMiddleware } from './request-context.js';

export const API_PREFIX = 'api';
export const API_DEFAULT_VERSION = '1';
const MAX_JSON_BODY_SIZE = '100kb';

/** Longer than the AWS ALB idle timeout (60 s), so the load balancer closes idle connections first. */
const KEEP_ALIVE_TIMEOUT_MS = 65_000;
const HEADERS_TIMEOUT_MS = 66_000;
const REQUEST_TIMEOUT_MS = 70_000;

/**
 * HTTP-level hardening shared by `main.ts` and the integration tests, so tests exercise exactly
 * what production runs. The app must be created with `bodyParser: false`.
 */
export function configureApp(app: NestExpressApplication, config: AppConfig): void {
  app.set('trust proxy', config.trustProxyHops);
  app.use(requestContextMiddleware);
  app.use(
    helmet({
      // The API only returns JSON: nothing may load from it, and it may never be framed.
      contentSecurityPolicy: {
        useDefaults: false,
        directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
      },
      frameguard: { action: 'deny' },
    }),
  );
  app.useBodyParser('json', { limit: MAX_JSON_BODY_SIZE });
  app.setGlobalPrefix(API_PREFIX);
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: API_DEFAULT_VERSION });

  const server: Server = app.getHttpServer();
  server.keepAliveTimeout = KEEP_ALIVE_TIMEOUT_MS;
  server.headersTimeout = HEADERS_TIMEOUT_MS;
  server.requestTimeout = REQUEST_TIMEOUT_MS;
}
