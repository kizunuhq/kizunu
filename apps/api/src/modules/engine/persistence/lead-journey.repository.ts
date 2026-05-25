import { leadJourneys } from '@kizunu/api/db/schemas/lead-journeys'
import { leads } from '@kizunu/api/db/schemas/leads'
import { DrizzleService } from '@kizunu/nestjs-shared/modules/persistence/services/drizzle.service'
import { Injectable } from '@nestjs/common'
import { and, eq, inArray, lte } from 'drizzle-orm'

import type { LeadJourneyStatus as LeadJourneyStatusType } from '../core/domain/lead-journey-status'
import { LeadJourneyStatus } from '../core/domain/lead-journey-status'
import type { DbTransaction } from './transaction'

/** Statuses where a journey is still in flight, so re-entry must not start another. */
const NON_TERMINAL_STATUSES = [
  LeadJourneyStatus.Running,
  LeadJourneyStatus.Paused,
  LeadJourneyStatus.PausedOwnerInactive,
]

export interface LeadJourneySummary {
  id: string
  leadName: string
  cadenceId: string
  status: LeadJourneyStatusType
  currentStepOrder: number
  nextTouchAt: Date | null
  errorReason: string | null
}

export interface LockedJourney {
  id: string
  status: LeadJourneyStatusType
  currentStepOrder: number
  nextTouchAt: Date | null
  errorReason: string | null
  cadenceId: string
  workspaceId: string
  connectorAccountId: string
  leadExternalId: string
  leadName: string
  leadOwnerExternalId: string | null
  leadOwnerUserId: string | null
  leadPhone: string | null
}

@Injectable()
export class LeadJourneyRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async hasNonTerminal(leadId: string, cadenceId: string): Promise<boolean> {
    const rows = await this.drizzle.db
      .select({ id: leadJourneys.id })
      .from(leadJourneys)
      .where(
        and(
          eq(leadJourneys.leadId, leadId),
          eq(leadJourneys.cadenceId, cadenceId),
          inArray(leadJourneys.status, NON_TERMINAL_STATUSES),
        ),
      )
      .limit(1)
    return !!rows[0]
  }

  async create(input: {
    leadId: string
    cadenceId: string
    nextTouchAt: Date | null
    status?: LeadJourneyStatusType
    errorReason?: string | null
  }): Promise<{ id: string }> {
    const rows = await this.drizzle.db
      .insert(leadJourneys)
      .values({
        leadId: input.leadId,
        cadenceId: input.cadenceId,
        nextTouchAt: input.nextTouchAt,
        status: input.status ?? LeadJourneyStatus.Running,
        errorReason: input.errorReason ?? null,
      })
      .returning({ id: leadJourneys.id })
    const journey = rows[0]
    if (!journey) throw new Error('Failed to create lead journey')
    return journey
  }

  /** Ids of running journeys whose next touch is due. Read without a lock; each id is
   * then locked individually inside its own dispatch transaction. */
  async findDueIds(now: Date, limit: number): Promise<string[]> {
    const rows = await this.drizzle.db
      .select({ id: leadJourneys.id })
      .from(leadJourneys)
      .where(
        and(eq(leadJourneys.status, LeadJourneyStatus.Running), lte(leadJourneys.nextTouchAt, now)),
      )
      .limit(limit)
    return rows.map((row) => row.id)
  }

  /** Locks a journey row (`SELECT … FOR UPDATE`) and returns it joined with its lead. */
  async lockById(tx: DbTransaction, id: string): Promise<LockedJourney | undefined> {
    const rows = await tx
      .select({
        id: leadJourneys.id,
        status: leadJourneys.status,
        currentStepOrder: leadJourneys.currentStepOrder,
        nextTouchAt: leadJourneys.nextTouchAt,
        errorReason: leadJourneys.errorReason,
        cadenceId: leadJourneys.cadenceId,
        workspaceId: leads.workspaceId,
        connectorAccountId: leads.connectorAccountId,
        leadExternalId: leads.externalId,
        leadName: leads.name,
        leadOwnerExternalId: leads.ownerExternalId,
        leadOwnerUserId: leads.ownerUserId,
        leadPhone: leads.phone,
      })
      .from(leadJourneys)
      .innerJoin(leads, eq(leadJourneys.leadId, leads.id))
      .where(eq(leadJourneys.id, id))
      .limit(1)
      .for('update', { of: leadJourneys })
    return rows[0]
  }

  async advance(
    tx: DbTransaction,
    id: string,
    currentStepOrder: number,
    nextTouchAt: Date,
  ): Promise<void> {
    await tx
      .update(leadJourneys)
      .set({ currentStepOrder, nextTouchAt })
      .where(eq(leadJourneys.id, id))
  }

  async setStatus(
    tx: DbTransaction,
    id: string,
    status: LeadJourneyStatusType,
    errorReason: string | null = null,
  ): Promise<void> {
    await tx
      .update(leadJourneys)
      .set({ status, nextTouchAt: null, errorReason })
      .where(eq(leadJourneys.id, id))
  }

  async listByWorkspace(
    workspaceId: string,
    status?: LeadJourneyStatusType,
  ): Promise<LeadJourneySummary[]> {
    const filters = [eq(leads.workspaceId, workspaceId)]
    if (status) filters.push(eq(leadJourneys.status, status))
    return await this.drizzle.db
      .select({
        id: leadJourneys.id,
        leadName: leads.name,
        cadenceId: leadJourneys.cadenceId,
        status: leadJourneys.status,
        currentStepOrder: leadJourneys.currentStepOrder,
        nextTouchAt: leadJourneys.nextTouchAt,
        errorReason: leadJourneys.errorReason,
      })
      .from(leadJourneys)
      .innerJoin(leads, eq(leadJourneys.leadId, leads.id))
      .where(and(...filters))
  }

  /** Parks an inactive owner's running journeys (admin reassignment, manual). */
  async findInWorkspace(
    id: string,
    workspaceId: string,
  ): Promise<{ id: string; status: LeadJourneyStatusType } | undefined> {
    const rows = await this.drizzle.db
      .select({ id: leadJourneys.id, status: leadJourneys.status })
      .from(leadJourneys)
      .innerJoin(leads, eq(leadJourneys.leadId, leads.id))
      .where(and(eq(leadJourneys.id, id), eq(leads.workspaceId, workspaceId)))
      .limit(1)
    return rows[0]
  }

  async updateStatus(
    id: string,
    status: LeadJourneyStatusType,
    nextTouchAt: Date | null,
  ): Promise<void> {
    await this.drizzle.db
      .update(leadJourneys)
      .set({ status, nextTouchAt })
      .where(eq(leadJourneys.id, id))
  }

  async pauseAllRunningInWorkspace(workspaceId: string): Promise<void> {
    const ownedLeads = this.drizzle.db
      .select({ id: leads.id })
      .from(leads)
      .where(eq(leads.workspaceId, workspaceId))
    await this.drizzle.db
      .update(leadJourneys)
      .set({ status: LeadJourneyStatus.Paused, nextTouchAt: null })
      .where(
        and(
          eq(leadJourneys.status, LeadJourneyStatus.Running),
          inArray(leadJourneys.leadId, ownedLeads),
        ),
      )
  }

  async pauseRunningForOwner(workspaceId: string, ownerUserId: string): Promise<void> {
    const owned = this.drizzle.db
      .select({ id: leads.id })
      .from(leads)
      .where(and(eq(leads.workspaceId, workspaceId), eq(leads.ownerUserId, ownerUserId)))
    await this.drizzle.db
      .update(leadJourneys)
      .set({ status: LeadJourneyStatus.PausedOwnerInactive, nextTouchAt: null })
      .where(
        and(
          eq(leadJourneys.status, LeadJourneyStatus.Running),
          inArray(leadJourneys.leadId, owned),
        ),
      )
  }

  /** Resumes journeys parked for an owner (e.g. after reassignment), due immediately. */
  async resumePausedForOwner(workspaceId: string, ownerUserId: string, now: Date): Promise<void> {
    const owned = this.drizzle.db
      .select({ id: leads.id })
      .from(leads)
      .where(and(eq(leads.workspaceId, workspaceId), eq(leads.ownerUserId, ownerUserId)))
    await this.drizzle.db
      .update(leadJourneys)
      .set({ status: LeadJourneyStatus.Running, nextTouchAt: now })
      .where(
        and(
          eq(leadJourneys.status, LeadJourneyStatus.PausedOwnerInactive),
          inArray(leadJourneys.leadId, owned),
        ),
      )
  }

  /**
   * Resumes journeys parked in `error_state` for a specific reason against a set of leads.
   * Used by the owner-mapping backfill — when admin creates a mapping, leads matching the
   * external owner have their ownerUserId set and any journey that landed in
   * `error_state` reason `owner_not_mapped` flips back to `running` immediately.
   */
  async resumeErrorStateByLeadsAndReason(
    tx: DbTransaction,
    input: { leadIds: readonly string[]; reason: string; nextTouchAt: Date },
  ): Promise<{ updated: number }> {
    if (input.leadIds.length === 0) return { updated: 0 }
    const rows = await tx
      .update(leadJourneys)
      .set({ status: LeadJourneyStatus.Running, errorReason: null, nextTouchAt: input.nextTouchAt })
      .where(
        and(
          inArray(leadJourneys.leadId, [...input.leadIds]),
          eq(leadJourneys.status, LeadJourneyStatus.ErrorState),
          eq(leadJourneys.errorReason, input.reason),
        ),
      )
      .returning({ id: leadJourneys.id })
    return { updated: rows.length }
  }

  /** Inbound seam: a running journey for the lead reachable at this phone in a workspace. */
  async findRunningByLeadPhone(
    workspaceId: string,
    phone: string,
  ): Promise<{ id: string } | undefined> {
    const rows = await this.drizzle.db
      .select({ id: leadJourneys.id })
      .from(leadJourneys)
      .innerJoin(leads, eq(leadJourneys.leadId, leads.id))
      .where(
        and(
          eq(leads.workspaceId, workspaceId),
          eq(leads.phone, phone),
          eq(leadJourneys.status, LeadJourneyStatus.Running),
        ),
      )
      .limit(1)
    return rows[0]
  }
}
