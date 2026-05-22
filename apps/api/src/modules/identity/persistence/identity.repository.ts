import { type Identity, identities } from '@kizunu/api/db/schemas/identities'
import { DrizzleService } from '@kizunu/nestjs-shared/modules/persistence/services/drizzle.service'
import { Injectable } from '@nestjs/common'
import { and, eq } from 'drizzle-orm'

@Injectable()
export class IdentityRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async findByProviderAccount(
    provider: string,
    providerAccountId: string,
  ): Promise<Identity | undefined> {
    const rows = await this.drizzle.db
      .select()
      .from(identities)
      .where(
        and(eq(identities.provider, provider), eq(identities.providerAccountId, providerAccountId)),
      )
      .limit(1)
    return rows[0]
  }

  async create(input: {
    userId: string
    provider: string
    providerAccountId: string
  }): Promise<Identity> {
    const rows = await this.drizzle.db.insert(identities).values(input).returning()
    const created = rows[0]
    if (!created) throw new Error('Failed to create identity')
    return created
  }
}
