import { ApplicationException } from '@kizunu/nestjs-shared/lib/exceptions/application.exception'

export class TemplateNotFoundException extends ApplicationException {
  constructor(templateId: string) {
    super('template.not-found', 'Template not found.', 404, { templateId })
  }
}

export class DuplicateTemplateException extends ApplicationException {
  constructor(name: string) {
    super('template.duplicate-name', 'A template with this name already exists.', 409, { name })
  }
}
