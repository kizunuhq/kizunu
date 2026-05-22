import { touchAttempts } from '@kizunu/api/db/schemas/touch-attempts'
import { Injectable } from '@nestjs/common'
import { eq } from 'drizzle-orm'

import type { DbTransaction } from './transaction'

export interface TouchAttemptResult {
  status: 'sent' | 'failed' | 'skipped'
  externalMessageId?: string
  externalActivityId?: string
  error?: string
}

@Injectable()
export class TouchAttemptRepository {
  /**
   * Claims the `(journey, step)` slot inside the dispatch transaction. Returns the new
   * row id, or `undefined` when the slot already exists — the D1 idempotency guard.
   */
  async tryInsert(
    tx: DbTransaction,
    leadJourneyId: string,
    stepOrder: number,
  ): Promise<{ id: string } | undefined> {
    const rows = await tx
      .insert(touchAttempts)
      .values({ leadJourneyId, stepOrder, status: 'pending' })
      .onConflictDoNothing({ target: [touchAttempts.leadJourneyId, touchAttempts.stepOrder] })
      .returning({ id: touchAttempts.id })
    return rows[0]
  }

  async recordResult(tx: DbTransaction, id: string, result: TouchAttemptResult): Promise<void> {
    await tx
      .update(touchAttempts)
      .set({
        status: result.status,
        externalMessageId: result.externalMessageId,
        externalActivityId: result.externalActivityId,
        error: result.error,
      })
      .where(eq(touchAttempts.id, id))
  }
}
