import type { CadenceAction, CadenceStepInput } from '@kizunu/api-contracts/cadence'
import { cadenceSteps } from '@kizunu/api/db/schemas/cadence-steps'
import { cadences } from '@kizunu/api/db/schemas/cadences'
import { DrizzleService } from '@kizunu/nestjs-shared/modules/persistence/services/drizzle.service'
import { Injectable } from '@nestjs/common'
import { and, eq, sql } from 'drizzle-orm'

import type { SendingWindow } from '../core/domain/sending-window'

export interface CadenceFields {
  workspaceId: string
  name: string
  status: 'active' | 'inactive'
  stopOnReply: boolean
  onReply: CadenceAction[]
  onExhausted: CadenceAction[]
  onComplete: CadenceAction[]
  sendingWindow: SendingWindow | null
}

export interface CadenceStepRow {
  stepOrder: number
  delayMinutes: number
  jitterMinutes: number
  channelStrategy: 'lead_owner'
  channelPluginId: string
  templateId: string | null
}

export interface CadenceWithSteps extends Omit<CadenceFields, 'workspaceId'> {
  id: string
  steps: CadenceStepRow[]
}

export interface CadenceSummary {
  id: string
  name: string
  status: 'active' | 'inactive'
  stepCount: number
}

const stepColumns = {
  stepOrder: cadenceSteps.stepOrder,
  delayMinutes: cadenceSteps.delayMinutes,
  jitterMinutes: cadenceSteps.jitterMinutes,
  channelStrategy: cadenceSteps.channelStrategy,
  channelPluginId: cadenceSteps.channelPluginId,
  templateId: cadenceSteps.templateId,
}

function buildStepValues(cadenceId: string, steps: CadenceStepInput[]) {
  return steps.map((step, index) => ({
    cadenceId,
    stepOrder: index,
    delayMinutes: step.delayMinutes,
    jitterMinutes: step.jitterMinutes,
    channelStrategy: step.channelStrategy,
    channelPluginId: step.channelPluginId,
    templateId: step.templateId,
  }))
}

@Injectable()
export class CadenceRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async createWithSteps(fields: CadenceFields, steps: CadenceStepInput[]): Promise<{ id: string }> {
    return await this.drizzle.db.transaction(async (tx) => {
      const rows = await tx.insert(cadences).values(fields).returning({ id: cadences.id })
      const created = rows[0]
      if (!created) throw new Error('Failed to create cadence')
      await tx.insert(cadenceSteps).values(buildStepValues(created.id, steps))
      return created
    })
  }

  async updateWithSteps(
    id: string,
    fields: Omit<CadenceFields, 'workspaceId'>,
    steps: CadenceStepInput[],
  ): Promise<void> {
    await this.drizzle.db.transaction(async (tx) => {
      await tx.update(cadences).set(fields).where(eq(cadences.id, id))
      await tx.delete(cadenceSteps).where(eq(cadenceSteps.cadenceId, id))
      await tx.insert(cadenceSteps).values(buildStepValues(id, steps))
    })
  }

  async findByIdInWorkspace(id: string, workspaceId: string): Promise<{ id: string } | undefined> {
    const rows = await this.drizzle.db
      .select({ id: cadences.id })
      .from(cadences)
      .where(and(eq(cadences.id, id), eq(cadences.workspaceId, workspaceId)))
      .limit(1)
    return rows[0]
  }

  async getWithSteps(id: string, workspaceId: string): Promise<CadenceWithSteps | undefined> {
    const rows = await this.drizzle.db
      .select({
        id: cadences.id,
        name: cadences.name,
        status: cadences.status,
        stopOnReply: cadences.stopOnReply,
        onReply: cadences.onReply,
        onExhausted: cadences.onExhausted,
        onComplete: cadences.onComplete,
        sendingWindow: cadences.sendingWindow,
      })
      .from(cadences)
      .where(and(eq(cadences.id, id), eq(cadences.workspaceId, workspaceId)))
      .limit(1)
    const cadence = rows[0]
    if (!cadence) return undefined
    const steps = await this.drizzle.db
      .select(stepColumns)
      .from(cadenceSteps)
      .where(eq(cadenceSteps.cadenceId, id))
      .orderBy(cadenceSteps.stepOrder)
    return { ...cadence, steps }
  }

  async listByWorkspace(workspaceId: string): Promise<CadenceSummary[]> {
    return await this.drizzle.db
      .select({
        id: cadences.id,
        name: cadences.name,
        status: cadences.status,
        stepCount: sql<number>`count(${cadenceSteps.id})`.mapWith(Number),
      })
      .from(cadences)
      .leftJoin(cadenceSteps, eq(cadenceSteps.cadenceId, cadences.id))
      .where(eq(cadences.workspaceId, workspaceId))
      .groupBy(cadences.id)
  }

  /** Delay (minutes) of the cadence's first step — the engine uses it for the first touch. */
  async firstStepDelayMinutes(cadenceId: string): Promise<number | undefined> {
    const rows = await this.drizzle.db
      .select({ delayMinutes: cadenceSteps.delayMinutes })
      .from(cadenceSteps)
      .where(eq(cadenceSteps.cadenceId, cadenceId))
      .orderBy(cadenceSteps.stepOrder)
      .limit(1)
    return rows[0]?.delayMinutes
  }

  async delete(id: string): Promise<void> {
    await this.drizzle.db.delete(cadences).where(eq(cadences.id, id))
  }
}
