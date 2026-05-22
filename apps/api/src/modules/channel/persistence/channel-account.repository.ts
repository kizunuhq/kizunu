import { channelAccounts } from '@kizunu/api/db/schemas/channel-accounts'
import { DrizzleService } from '@kizunu/nestjs-shared/modules/persistence/services/drizzle.service'
import { Injectable } from '@nestjs/common'
import { and, eq, sql } from 'drizzle-orm'

export interface ChannelAccountSummary {
  id: string
  pluginId: string
  name: string
  createdAt: Date
}

@Injectable()
export class ChannelAccountRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async create(input: {
    workspaceId: string
    pluginId: string
    name: string
    credentials: unknown
  }): Promise<{ id: string }> {
    const rows = await this.drizzle.db
      .insert(channelAccounts)
      .values(input)
      .returning({ id: channelAccounts.id })
    const created = rows[0]
    if (!created) throw new Error('Failed to create channel account')
    return created
  }

  async findByIdInWorkspace(id: string, workspaceId: string): Promise<{ id: string } | undefined> {
    const rows = await this.drizzle.db
      .select({ id: channelAccounts.id })
      .from(channelAccounts)
      .where(and(eq(channelAccounts.id, id), eq(channelAccounts.workspaceId, workspaceId)))
      .limit(1)
    return rows[0]
  }

  /** Inbound seam: route a webhook to its account by a credential field (e.g. Meta's
   * phoneNumberId). The plugin/credential key keeps provider specifics at the edge. */
  async findByPluginAndCredential(
    pluginId: string,
    key: string,
    value: string,
  ): Promise<{ id: string; workspaceId: string } | undefined> {
    const rows = await this.drizzle.db
      .select({ id: channelAccounts.id, workspaceId: channelAccounts.workspaceId })
      .from(channelAccounts)
      .where(
        and(
          eq(channelAccounts.pluginId, pluginId),
          sql`${channelAccounts.credentials} ->> ${key} = ${value}`,
        ),
      )
      .limit(1)
    return rows[0]
  }

  /** Engine seam: the credentials the channel plugin needs to send. */
  async findCredentials(id: string): Promise<{ credentials: unknown } | undefined> {
    const rows = await this.drizzle.db
      .select({ credentials: channelAccounts.credentials })
      .from(channelAccounts)
      .where(eq(channelAccounts.id, id))
      .limit(1)
    return rows[0]
  }

  async listByWorkspace(workspaceId: string): Promise<ChannelAccountSummary[]> {
    return await this.drizzle.db
      .select({
        id: channelAccounts.id,
        pluginId: channelAccounts.pluginId,
        name: channelAccounts.name,
        createdAt: channelAccounts.createdAt,
      })
      .from(channelAccounts)
      .where(eq(channelAccounts.workspaceId, workspaceId))
  }
}
