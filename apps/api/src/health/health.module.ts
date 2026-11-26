import { Module } from '@nestjs/common';
import { DatabaseHealthRepository } from './database-health.repository.js';
import { HealthController } from './health.controller.js';

@Module({
  controllers: [HealthController],
  providers: [DatabaseHealthRepository],
})
export class HealthModule {}
