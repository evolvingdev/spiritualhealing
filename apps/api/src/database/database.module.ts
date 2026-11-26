import { Global, Inject, Injectable, Module, type OnApplicationShutdown } from '@nestjs/common';
import { createDatabase, type Database, type DatabaseHandle } from '@spiritualhealing/db';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';

export const DATABASE = Symbol('DATABASE');
const DATABASE_HANDLE = Symbol('DATABASE_HANDLE');

const CONNECT_TIMEOUT_SECONDS = 10;
const IDLE_TIMEOUT_SECONDS = 30;

@Injectable()
class DatabaseShutdown implements OnApplicationShutdown {
  constructor(@Inject(DATABASE_HANDLE) private readonly handle: DatabaseHandle) {}

  async onApplicationShutdown(): Promise<void> {
    await this.handle.close();
  }
}

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_HANDLE,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig): DatabaseHandle =>
        createDatabase({
          url: config.database.url,
          maxConnections: config.database.maxConnections,
          connectTimeoutSeconds: CONNECT_TIMEOUT_SECONDS,
          idleTimeoutSeconds: IDLE_TIMEOUT_SECONDS,
        }),
    },
    {
      provide: DATABASE,
      inject: [DATABASE_HANDLE],
      useFactory: (handle: DatabaseHandle): Database => handle.db,
    },
    DatabaseShutdown,
  ],
  exports: [DATABASE],
})
export class DatabaseModule {}
