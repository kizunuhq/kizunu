import { auditEvents } from '@kizunu/api/db/schemas/audit-events'
import { DrizzleService } from '@kizunu/nestjs-shared/modules/persistence/services/drizzle.service'
import { Injectable } from '@nestjs/common'
import { and, desc, eq } from 'drizzle-orm'

export interface AuditEventSummary {
  id: string
  journeyId: string | null
  kind: string
  payload: unknown
  createdAt: Date
}

export interface RecordAuditEventInput {
  workspaceId: string
  journeyId?: string | null
  kind: string
  payload?: unknown
}

const DEFAULT_LIMIT = 200

function jsonPayload(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return { ...value }
  }
  return {}
}

@Injectable()
export class AuditEventRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async record(input: RecordAuditEventInput): Promise<void> {
    await this.drizzle.db.insert(auditEvents).values({
      workspaceId: input.workspaceId,
      journeyId: input.journeyId ?? null,
      kind: input.kind,
      payload: jsonPayload(input.payload),
    })
  }

  async listByWorkspace(
    workspaceId: string,
    limit: number = DEFAULT_LIMIT,
  ): Promise<AuditEventSummary[]> {
    return await this.drizzle.db
      .select({
        id: auditEvents.id,
        journeyId: auditEvents.journeyId,
        kind: auditEvents.kind,
        payload: auditEvents.payload,
        createdAt: auditEvents.createdAt,
      })
      .from(auditEvents)
      .where(eq(auditEvents.workspaceId, workspaceId))
      .orderBy(desc(auditEvents.createdAt))
      .limit(limit)
  }

  async listByJourney(
    workspaceId: string,
    journeyId: string,
    limit: number = DEFAULT_LIMIT,
  ): Promise<AuditEventSummary[]> {
    return await this.drizzle.db
      .select({
        id: auditEvents.id,
        journeyId: auditEvents.journeyId,
        kind: auditEvents.kind,
        payload: auditEvents.payload,
        createdAt: auditEvents.createdAt,
      })
      .from(auditEvents)
      .where(and(eq(auditEvents.workspaceId, workspaceId), eq(auditEvents.journeyId, journeyId)))
      .orderBy(desc(auditEvents.createdAt))
      .limit(limit)
  }
}
