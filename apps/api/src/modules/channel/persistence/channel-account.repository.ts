import { channelAccounts } from '@kizunu/api/db/schemas/channel-accounts'
import { DrizzleService } from '@kizunu/nestjs-shared/modules/persistence/services/drizzle.service'
import { EncryptedCredentialsService } from '@kizunu/nestjs-shared/modules/persistence/services/encrypted-credentials.service'
import { Injectable } from '@nestjs/common'
import { and, eq } from 'drizzle-orm'

export interface ChannelAccountSummary {
  id: string
  pluginId: string
  name: string
  createdAt: Date
}

export interface NearExpiryChannelAccount {
  id: string
  pluginId: string
  credentials: unknown
}

@Injectable()
export class ChannelAccountRepository {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly cipher: EncryptedCredentialsService,
  ) {}

  /**
   * `id` is optional so callers that need to know the row's id BEFORE persistence
   * (e.g. the create use-case pre-mints it so plugin `onAccountCreated` can embed
   * the id in provider callback URLs) can pass an explicit one in. When omitted,
   * Drizzle's `defaults()` generates a UUIDv7. `credentials` is encrypted at this
   * boundary.
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
      .values({ ...input, credentials: this.cipher.encrypt(input.credentials) })
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
    const row = rows[0]
    if (!row) return undefined
    return { credentials: this.cipher.decrypt(row.credentials) }
  }

  /**
   * Inbound-webhook seam for the per-channel URL. The Meta webhook controller
   * routes by `:channelAccountId` in the path, then loads the row's workspaceId
   * (for MarkReplyUseCase) and credentials (for the per-channel `verifyToken`
   * check + plugin parseInbound).
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
    const row = rows[0]
    if (!row) return undefined
    return { workspaceId: row.workspaceId, credentials: this.cipher.decrypt(row.credentials) }
  }

  /** Directory seam: pluginId + decrypted credentials in one read, workspace scope enforced at the caller. */
  async findForDirectory(
    id: string,
  ): Promise<{ workspaceId: string; pluginId: string; credentials: unknown } | undefined> {
    const rows = await this.drizzle.db
      .select({
        workspaceId: channelAccounts.workspaceId,
        pluginId: channelAccounts.pluginId,
        credentials: channelAccounts.credentials,
      })
      .from(channelAccounts)
      .where(eq(channelAccounts.id, id))
      .limit(1)
    const row = rows[0]
    if (!row) return undefined
    return {
      workspaceId: row.workspaceId,
      pluginId: row.pluginId,
      credentials: this.cipher.decrypt(row.credentials),
    }
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

  /**
   * Returns every channel-account row's decrypted credentials so the
   * `OAuthRefreshService` can filter in JS by `accessTokenExpiresAt <= cutoff`.
   * Encryption hides the expiry timestamp from the database, so a SQL pre-filter
   * is not possible without denormalizing the column (deferred until volume
   * warrants it).
   */
  async findAllWithCredentials(): Promise<NearExpiryChannelAccount[]> {
    const rows = await this.drizzle.db
      .select({
        id: channelAccounts.id,
        pluginId: channelAccounts.pluginId,
        credentials: channelAccounts.credentials,
      })
      .from(channelAccounts)
    return rows.map((row) => ({
      id: row.id,
      pluginId: row.pluginId,
      credentials: this.cipher.decrypt(row.credentials),
    }))
  }

  /** Updates the credentials JSONB; used by OAuthRefreshService after a refresh. */
  async persistCredentials(id: string, credentials: unknown): Promise<void> {
    await this.drizzle.db
      .update(channelAccounts)
      .set({ credentials: this.cipher.encrypt(credentials) })
      .where(eq(channelAccounts.id, id))
  }
}
