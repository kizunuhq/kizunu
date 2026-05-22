import { leadJourneys } from '@kizunu/api/db/schemas/lead-journeys'
import { DrizzleService } from '@kizunu/nestjs-shared/modules/persistence/services/drizzle.service'
import { Injectable } from '@nestjs/common'
import { and, eq, inArray } from 'drizzle-orm'

import { LeadJourneyStatus } from '../core/domain/lead-journey-status'

/** Statuses where a journey is still in flight, so re-entry must not start another. */
const NON_TERMINAL_STATUSES = [
  LeadJourneyStatus.Running,
  LeadJourneyStatus.Paused,
  LeadJourneyStatus.PausedOwnerInactive,
]

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
    nextTouchAt: Date
  }): Promise<{ id: string }> {
    const rows = await this.drizzle.db
      .insert(leadJourneys)
      .values({ leadId: input.leadId, cadenceId: input.cadenceId, nextTouchAt: input.nextTouchAt })
      .returning({ id: leadJourneys.id })
    const journey = rows[0]
    if (!journey) throw new Error('Failed to create lead journey')
    return journey
  }
}
