import { Injectable, type OnModuleDestroy } from '@nestjs/common'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

@Injectable()
export class DrizzleService implements OnModuleDestroy {
  public readonly db: NodePgDatabase
  private readonly pool: Pool

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString })
    this.db = drizzle(this.pool, { casing: 'snake_case' })
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end()
  }
}
