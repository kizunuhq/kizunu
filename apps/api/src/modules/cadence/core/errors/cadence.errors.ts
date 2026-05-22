import { ApplicationException } from '@kizunu/nestjs-shared/lib/exceptions/application.exception'

export class CadenceNotFoundException extends ApplicationException {
  constructor(cadenceId: string) {
    super('cadence.not-found', 'Cadence not found.', 404, { cadenceId })
  }
}

export class EmptyCadenceException extends ApplicationException {
  constructor() {
    super('cadence.empty', 'A cadence must have at least one step.', 422)
  }
}

export class TemplateChannelMismatchException extends ApplicationException {
  constructor(templateId: string) {
    super(
      'cadence.template-channel-mismatch',
      'The step template targets a different channel plugin than the step.',
      422,
      { templateId },
    )
  }
}
