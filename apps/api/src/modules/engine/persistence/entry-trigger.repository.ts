import { entryTriggers } from '@kizunu/api/db/schemas/entry-triggers'
import { DrizzleService } from '@kizunu/nestjs-shared/modules/persistence/services/drizzle.service'
import { Injectable } from '@nestjs/common'
import { and, eq } from 'drizzle-orm'

export interface EntryTriggerRow {
  id: string
  connectorAccountId: string
  pipelineId: string | null
  stageId: string
  cadenceId: string
}

@Injectable()
export class EntryTriggerRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async create(input: {
    workspaceId: string
    connectorAccountId: string
    pipelineId: string | null
    stageId: string
    cadenceId: string
  }): Promise<{ id: string }> {
    const rows = await this.drizzle.db
      .insert(entryTriggers)
      .values(input)
      .returning({ id: entryTriggers.id })
    const created = rows[0]
    if (!created) throw new Error('Failed to create entry trigger')
    return created
  }

  async findByAccountAndStage(
    connectorAccountId: string,
    stageId: string,
  ): Promise<{ id: string } | undefined> {
    const rows = await this.drizzle.db
      .select({ id: entryTriggers.id })
      .from(entryTriggers)
      .where(
        and(
          eq(entryTriggers.connectorAccountId, connectorAccountId),
          eq(entryTriggers.stageId, stageId),
        ),
      )
      .limit(1)
    return rows[0]
  }

  async findByIdInWorkspace(id: string, workspaceId: string): Promise<{ id: string } | undefined> {
    const rows = await this.drizzle.db
      .select({ id: entryTriggers.id })
      .from(entryTriggers)
      .where(and(eq(entryTriggers.id, id), eq(entryTriggers.workspaceId, workspaceId)))
      .limit(1)
    return rows[0]
  }

  async listByWorkspace(workspaceId: string): Promise<EntryTriggerRow[]> {
    return await this.drizzle.db
      .select({
        id: entryTriggers.id,
        connectorAccountId: entryTriggers.connectorAccountId,
        pipelineId: entryTriggers.pipelineId,
        stageId: entryTriggers.stageId,
        cadenceId: entryTriggers.cadenceId,
      })
      .from(entryTriggers)
      .where(eq(entryTriggers.workspaceId, workspaceId))
  }

  /** Ingestion seam: the cadence to start when a deal enters a stage. */
  async findCadenceByStage(
    connectorAccountId: string,
    stageId: string,
  ): Promise<{ cadenceId: string } | undefined> {
    const rows = await this.drizzle.db
      .select({ cadenceId: entryTriggers.cadenceId })
      .from(entryTriggers)
      .where(
        and(
          eq(entryTriggers.connectorAccountId, connectorAccountId),
          eq(entryTriggers.stageId, stageId),
        ),
      )
      .limit(1)
    return rows[0]
  }

  async delete(id: string): Promise<void> {
    await this.drizzle.db.delete(entryTriggers).where(eq(entryTriggers.id, id))
  }
}
