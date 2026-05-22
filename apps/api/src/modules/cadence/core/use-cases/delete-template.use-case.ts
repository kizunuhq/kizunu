import { Injectable } from '@nestjs/common'

import { TemplateRepository } from '../../persistence/template.repository'
import { TemplateNotFoundException } from '../errors/template.errors'

export interface DeleteTemplateInput {
  workspaceId: string
  templateId: string
}

@Injectable()
export class DeleteTemplateUseCase {
  constructor(private readonly templates: TemplateRepository) {}

  async execute(input: DeleteTemplateInput): Promise<void> {
    const template = await this.templates.findByIdInWorkspace(input.templateId, input.workspaceId)
    if (!template) throw new TemplateNotFoundException(input.templateId)

    await this.templates.delete(input.templateId)
  }
}
