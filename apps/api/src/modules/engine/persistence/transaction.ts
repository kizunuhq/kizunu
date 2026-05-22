import type { DrizzleService } from '@kizunu/nestjs-shared/modules/persistence/services/drizzle.service'

/**
 * The transaction executor drizzle hands to a `db.transaction(tx => …)` callback.
 * Repos that participate in the dispatcher's locked transaction accept this so the
 * `SELECT … FOR UPDATE`, the `TouchAttempt` insert, and the journey update all commit
 * (or roll back) together (decision D1).
 */
export type DbTransaction = Parameters<Parameters<DrizzleService['db']['transaction']>[0]>[0]
