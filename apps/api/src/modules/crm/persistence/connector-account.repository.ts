import { connectorAccounts } from '@kizunu/api/db/schemas/connector-accounts'
import { DrizzleService } from '@kizunu/nestjs-shared/modules/persistence/services/drizzle.service'
import { Injectable } from '@nestjs/common'
import { and, eq } from 'drizzle-orm'

export interface ConnectorAccountSummary {
  id: string
  connectorId: string
  name: string
  createdAt: Date
}

@Injectable()
export class ConnectorAccountRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async create(input: {
    workspaceId: string
    connectorId: string
    name: string
    credentials: unknown
  }): Promise<{ id: string }> {
    const rows = await this.drizzle.db
      .insert(connectorAccounts)
      .values(input)
      .returning({ id: connectorAccounts.id })
    const created = rows[0]
    if (!created) throw new Error('Failed to create connector account')
    return created
  }

  async listByWorkspace(workspaceId: string): Promise<ConnectorAccountSummary[]> {
    return await this.drizzle.db
      .select({
        id: connectorAccounts.id,
        connectorId: connectorAccounts.connectorId,
        name: connectorAccounts.name,
        createdAt: connectorAccounts.createdAt,
      })
      .from(connectorAccounts)
      .where(eq(connectorAccounts.workspaceId, workspaceId))
  }

  async findByIdInWorkspace(id: string, workspaceId: string): Promise<{ id: string } | undefined> {
    const rows = await this.drizzle.db
      .select({ id: connectorAccounts.id })
      .from(connectorAccounts)
      .where(and(eq(connectorAccounts.id, id), eq(connectorAccounts.workspaceId, workspaceId)))
      .limit(1)
    return rows[0]
  }

  async findByConnectorInWorkspace(
    connectorId: string,
    workspaceId: string,
  ): Promise<{ id: string; credentials: unknown } | undefined> {
    const rows = await this.drizzle.db
      .select({ id: connectorAccounts.id, credentials: connectorAccounts.credentials })
      .from(connectorAccounts)
      .where(
        and(
          eq(connectorAccounts.connectorId, connectorId),
          eq(connectorAccounts.workspaceId, workspaceId),
        ),
      )
      .limit(1)
    return rows[0]
  }
}
