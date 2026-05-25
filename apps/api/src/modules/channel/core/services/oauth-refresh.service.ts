import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'

import {
  ChannelAccountRepository,
  type NearExpiryChannelAccount,
} from '../../persistence/channel-account.repository'
import { ChannelPluginRegistry } from '../plugin/channel-plugin-registry'

const POLL_INTERVAL_MS = 60_000
const DEFAULT_REFRESH_BUFFER_MS = 5 * 60_000
const MS_PER_S = 1000

export interface RefreshDueOptions {
  refreshBufferMs?: number
  now?: () => Date
}

export interface RefreshSummary {
  refreshed: number
  failed: number
}

/**
 * Background scheduler that keeps OAuth-using channel credentials fresh. Each
 * tick:
 * 1. Loads every channel-account row's decrypted credentials.
 * 2. Filters to rows whose `accessTokenExpiresAt` lies inside the refresh
 *    buffer window (`now <= accessTokenExpiresAt <= now + buffer`).
 * 3. For each, calls the row's plugin `refreshCredentials` hook and persists
 *    the returned credentials (re-encrypted at the repo boundary).
 *
 * Plugins without `refreshCredentials` are skipped (Pipedrive's static API
 * token, Meta's standalone Cloud API system token). A hook throw is caught,
 * logged with the channel-account id, and the row is left for the next tick.
 *
 * Same `NODE_ENV=test` guard as `JourneyPoller` (D5) so unit/integration/e2e
 * specs drive `refreshDue()` directly without the interval firing. Tests
 * inject `now` and `refreshBufferMs` per call so the constructor stays
 * DI-clean (no third Nest argument).
 */
@Injectable()
export class OAuthRefreshService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OAuthRefreshService.name)
  private timer?: ReturnType<typeof setInterval>

  constructor(
    private readonly accounts: ChannelAccountRepository,
    private readonly registry: ChannelPluginRegistry,
  ) {}

  onModuleInit(): void {
    if (process.env['NODE_ENV'] === 'test') return
    this.timer = setInterval(() => void this.tick(), POLL_INTERVAL_MS)
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer)
  }

  async refreshDue(options: RefreshDueOptions = {}): Promise<RefreshSummary> {
    const refreshBufferMs = options.refreshBufferMs ?? DEFAULT_REFRESH_BUFFER_MS
    const now = options.now ?? (() => new Date())
    const rows = await this.accounts.findAllWithCredentials()
    const cutoff = new Date(now().getTime() + refreshBufferMs)
    const due = rows.filter((row) => this.isNearExpiry(row, cutoff))

    let refreshed = 0
    let failed = 0
    for (const row of due) {
      if (await this.refreshOne(row)) {
        refreshed++
      } else {
        failed++
      }
    }
    return { refreshed, failed }
  }

  private isNearExpiry(row: NearExpiryChannelAccount, cutoff: Date): boolean {
    const plugin = this.registry.has(row.pluginId) ? this.registry.get(row.pluginId) : undefined
    if (!plugin?.refreshCredentials) return false
    const expiresAt = readExpiresAt(row.credentials)
    if (!expiresAt) return false
    return expiresAt.getTime() <= cutoff.getTime()
  }

  private async refreshOne(row: NearExpiryChannelAccount): Promise<boolean> {
    const plugin = this.registry.get(row.pluginId)
    if (!plugin.refreshCredentials) return false
    try {
      const refreshed = await this.registry.refreshCredentials(
        row.pluginId,
        row.id,
        row.credentials,
      )
      await this.accounts.persistCredentials(row.id, refreshed)
      return true
    } catch (error) {
      this.logger.error(`Refresh failed for channel-account ${row.id}`, error)
      return false
    }
  }

  private async tick(): Promise<void> {
    try {
      await this.refreshDue()
    } catch (error) {
      this.logger.error('OAuth refresh tick failed', error)
    }
  }
}

function readExpiresAt(credentials: unknown): Date | undefined {
  if (!credentials || typeof credentials !== 'object' || !('accessTokenExpiresAt' in credentials)) {
    return undefined
  }
  const value = credentials.accessTokenExpiresAt
  if (typeof value === 'string') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? undefined : parsed
  }
  if (value instanceof Date) return value
  if (typeof value === 'number') return new Date(value * MS_PER_S)
  return undefined
}
