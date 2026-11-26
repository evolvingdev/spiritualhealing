import { Catch, Logger, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';
import { getOrAssignCorrelationId } from '../http/request-context.js';
import {
  buildErrorEnvelope,
  classifyError,
  isServerError,
  readValidationDetails,
} from './error-response.js';

/**
 * The single place errors become HTTP responses. Every response uses the envelope from CLAUDE.md;
 * stack traces and internal messages are logged, never sent.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const correlationId = getOrAssignCorrelationId(request, response);
    const { status, code } = classifyError(exception);

    if (isServerError(status)) {
      this.logger.error({ err: exception, correlationId, code }, 'Request failed');
    }

    response
      .status(status)
      .json(buildErrorEnvelope(code, correlationId, readValidationDetails(exception)));
  }
}
