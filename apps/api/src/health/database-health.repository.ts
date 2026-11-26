import { Inject, Injectable } from '@nestjs/common';
import type { Database } from '@spiritualhealing/db';
import { sql } from 'drizzle-orm';
import { DATABASE } from '../database/database.module.js';

@Injectable()
export class DatabaseHealthRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async ping(): Promise<void> {
    await this.db.execute(sql`select 1`);
  }
}
