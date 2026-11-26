import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request, Response } from 'express';
import { getOrAssignCorrelationId } from './request-context.js';

/** The request's correlation ID, for audit records written by the handler. */
export const CorrelationId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const http = context.switchToHttp();
    return getOrAssignCorrelationId(http.getRequest<Request>(), http.getResponse<Response>());
  },
);
