import type { Params } from 'nestjs-pino';
import { stdTimeFunctions, type DestinationStream } from 'pino';
import type { AppConfig } from '../../config/app-config.js';
import { getOrAssignCorrelationId } from '../http/request-context.js';

const SERVICE_NAME = 'api';
const REDACTED = '[REDACTED]';

/**
 * Defence in depth: the serializers below already drop headers and bodies, but if anything adds
 * them back these paths are still censored. Changes here are a security change (ADR 0012).
 */
const REDACTED_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers.apikey',
  'res.headers["set-cookie"]',
  '*.authorization',
  '*.apikey',
  '*.token',
  '*.accessToken',
  '*.refreshToken',
  '*.publishableKey',
  '*.password',
  '*.email',
  '*.phone',
  '*.otp',
];

interface SerializedRequest {
  readonly id: unknown;
  readonly method: string;
  readonly url: string;
}

interface SerializedResponse {
  readonly statusCode: number;
}

/** Logs the path only: query strings are dropped so that nothing passed in them is ever logged. */
function serializeRequest(request: SerializedRequest): Record<string, unknown> {
  return { id: request.id, method: request.method, path: request.url.split('?', 1)[0] };
}

function serializeResponse(response: SerializedResponse): Record<string, unknown> {
  return { statusCode: response.statusCode };
}

export function createLoggerParams(config: AppConfig, destination?: DestinationStream): Params {
  const options = {
    level: config.logLevel,
    base: { service: SERVICE_NAME, environment: config.environment },
    timestamp: stdTimeFunctions.isoTime,
    genReqId: getOrAssignCorrelationId,
    redact: { paths: REDACTED_PATHS, censor: REDACTED },
    serializers: { req: serializeRequest, res: serializeResponse },
  };
  return { pinoHttp: destination === undefined ? options : [options, destination] };
}
