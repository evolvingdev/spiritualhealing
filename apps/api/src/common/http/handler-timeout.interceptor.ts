import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { throwError, timeout, type Observable } from 'rxjs';
import { ServiceUnavailableError } from '../errors/app-error.js';

const HANDLER_TIMEOUT_MS = 10_000;

/** Bounds how long a route handler may run, so a stuck dependency cannot hold requests open. */
@Injectable()
export class HandlerTimeoutInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      timeout({
        first: HANDLER_TIMEOUT_MS,
        with: () =>
          throwError(
            () => new ServiceUnavailableError(`Handler exceeded ${HANDLER_TIMEOUT_MS} ms`),
          ),
      }),
    );
  }
}
