import { Controller, Get, Inject, VERSION_NEUTRAL } from '@nestjs/common';
import { Public } from '../auth/decorators.js';
import { ServiceUnavailableError } from '../common/errors/app-error.js';
import { DatabaseHealthRepository } from './database-health.repository.js';

interface HealthStatus {
  readonly status: 'ok';
}

const HEALTHY: HealthStatus = { status: 'ok' };

/** Load balancer probes (ADR 0012). Responses never include internal details. */
@Public()
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    @Inject(DatabaseHealthRepository) private readonly database: DatabaseHealthRepository,
  ) {}

  @Get('live')
  live(): HealthStatus {
    return HEALTHY;
  }

  @Get('ready')
  async ready(): Promise<HealthStatus> {
    try {
      await this.database.ping();
    } catch (error) {
      throw new ServiceUnavailableError('Database is not reachable', { cause: error });
    }
    return HEALTHY;
  }
}
