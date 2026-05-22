import { channelAccesses } from '@kizunu/api/db/schemas/channel-accesses'
import { channelAccounts } from '@kizunu/api/db/schemas/channel-accounts'
import { DrizzleService } from '@kizunu/nestjs-shared/modules/persistence/services/drizzle.service'
import { Injectable } from '@nestjs/common'
import { and, eq, inArray } from 'drizzle-orm'

export interface MyChannel {
  channelAccountId: string
  pluginId: string
  name: string
  isPrimary: boolean
}

@Injectable()
export class ChannelAccessRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async findForUser(
    channelAccountId: string,
    userId: string,
  ): Promise<{ accessId: string; pluginId: string } | undefined> {
    const rows = await this.drizzle.db
      .select({ accessId: channelAccesses.id, pluginId: channelAccounts.pluginId })
      .from(channelAccesses)
      .innerJoin(channelAccounts, eq(channelAccesses.channelAccountId, channelAccounts.id))
      .where(
        and(
          eq(channelAccesses.channelAccountId, channelAccountId),
          eq(channelAccesses.userId, userId),
        ),
      )
      .limit(1)
    return rows[0]
  }

  async grant(channelAccountId: string, userId: string): Promise<void> {
    await this.drizzle.db
      .insert(channelAccesses)
      .values({ channelAccountId, userId })
      .onConflictDoNothing({
        target: [channelAccesses.channelAccountId, channelAccesses.userId],
      })
  }

  async revoke(channelAccountId: string, userId: string): Promise<void> {
    await this.drizzle.db
      .delete(channelAccesses)
      .where(
        and(
          eq(channelAccesses.channelAccountId, channelAccountId),
          eq(channelAccesses.userId, userId),
        ),
      )
  }

  async listByUser(userId: string): Promise<MyChannel[]> {
    return await this.drizzle.db
      .select({
        channelAccountId: channelAccounts.id,
        pluginId: channelAccounts.pluginId,
        name: channelAccounts.name,
        isPrimary: channelAccesses.isPrimary,
      })
      .from(channelAccesses)
      .innerJoin(channelAccounts, eq(channelAccesses.channelAccountId, channelAccounts.id))
      .where(eq(channelAccesses.userId, userId))
  }

  async makePrimary(input: { userId: string; accessId: string; pluginId: string }): Promise<void> {
    await this.drizzle.db.transaction(async (tx) => {
      const samePluginAccounts = tx
        .select({ id: channelAccounts.id })
        .from(channelAccounts)
        .where(eq(channelAccounts.pluginId, input.pluginId))
      await tx
        .update(channelAccesses)
        .set({ isPrimary: false })
        .where(
          and(
            eq(channelAccesses.userId, input.userId),
            inArray(channelAccesses.channelAccountId, samePluginAccounts),
          ),
        )
      await tx
        .update(channelAccesses)
        .set({ isPrimary: true })
        .where(eq(channelAccesses.id, input.accessId))
    })
  }

  async findPrimaryAccount(
    userId: string,
    pluginId: string,
  ): Promise<{ channelAccountId: string } | undefined> {
    const rows = await this.drizzle.db
      .select({ channelAccountId: channelAccounts.id })
      .from(channelAccesses)
      .innerJoin(channelAccounts, eq(channelAccesses.channelAccountId, channelAccounts.id))
      .where(
        and(
          eq(channelAccesses.userId, userId),
          eq(channelAccounts.pluginId, pluginId),
          eq(channelAccesses.isPrimary, true),
        ),
      )
      .limit(1)
    return rows[0]
  }
}
