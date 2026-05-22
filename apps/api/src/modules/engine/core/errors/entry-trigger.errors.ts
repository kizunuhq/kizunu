import { ApplicationException } from '@kizunu/nestjs-shared/lib/exceptions/application.exception'

export class EntryTriggerNotFoundException extends ApplicationException {
  constructor(entryTriggerId: string) {
    super('entry-trigger.not-found', 'Entry trigger not found.', 404, { entryTriggerId })
  }
}

export class DuplicateEntryTriggerException extends ApplicationException {
  constructor(stageId: string) {
    super(
      'entry-trigger.duplicate',
      'This connector account already maps a cadence for that stage.',
      409,
      { stageId },
    )
  }
}
