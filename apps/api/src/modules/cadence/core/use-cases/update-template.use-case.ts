import { Injectable } from '@nestjs/common'

import { type TemplatePatch, TemplateRepository } from '../../persistence/template.repository'
import { DuplicateTemplateException, TemplateNotFoundException } from '../errors/template.errors'

export interface UpdateTemplateInput {
  workspaceId: string
  templateId: string
  patch: TemplatePatch
}

@Injectable()
export class UpdateTemplateUseCase {
  constructor(private readonly templates: TemplateRepository) {}

  async execute(input: UpdateTemplateInput): Promise<void> {
    const template = await this.templates.findByIdInWorkspace(input.templateId, input.workspaceId)
    if (!template) throw new TemplateNotFoundException(input.templateId)

    await this.rejectNameClash(input)
    await this.templates.update(input.templateId, input.patch)
  }

  private async rejectNameClash(input: UpdateTemplateInput): Promise<void> {
    const name = input.patch.name
    if (name === undefined) return
    const clash = await this.templates.findByName(input.workspaceId, name)
    if (clash && clash.id !== input.templateId) throw new DuplicateTemplateException(name)
  }
}
