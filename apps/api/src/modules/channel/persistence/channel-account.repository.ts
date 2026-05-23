import { channelAccounts } from '@kizunu/api/db/schemas/channel-accounts'
import { DrizzleService } from '@kizunu/nestjs-shared/modules/persistence/services/drizzle.service'
import { Injectable } from '@nestjs/common'
import { and, eq } from 'drizzle-orm'

export interface ChannelAccountSummary {
  id: string
  pluginId: string
  name: string
  createdAt: Date
}

@Injectable()
export class ChannelAccountRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  /**
   * `id` is optional so callers that need to know the row's id BEFORE persistence
   * (e.g. the create use-case pre-mints it so plugin `onAccountCreated` can embed
   * the id in provider callback URLs, feature 029) can pass an explicit one in.
   * When omitted, Drizzle's `defaults()` generates a UUIDv7.
   */
  async create(input: {
    id?: string
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

  /** Engine seam: the credentials the channel plugin needs to send. */
  async findCredentials(id: string): Promise<{ credentials: unknown } | undefined> {
    const rows = await this.drizzle.db
      .select({ credentials: channelAccounts.credentials })
      .from(channelAccounts)
      .where(eq(channelAccounts.id, id))
      .limit(1)
    return rows[0]
  }

  /**
   * Inbound-webhook seam for the per-channel URL (feature 029). The Meta
   * webhook controller routes by `:channelAccountId` in the path, then loads
   * the row's workspaceId (for MarkReplyUseCase) and credentials (for the
   * per-channel `verifyToken` check + plugin parseInbound).
   */
  async findWorkspaceAndCredentials(
    id: string,
  ): Promise<{ workspaceId: string; credentials: unknown } | undefined> {
    const rows = await this.drizzle.db
      .select({
        workspaceId: channelAccounts.workspaceId,
        credentials: channelAccounts.credentials,
      })
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
