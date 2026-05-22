import { Injectable } from '@nestjs/common'

import { TemplateRepository } from '../../persistence/template.repository'
import { DuplicateTemplateException } from '../errors/template.errors'

export interface CreateTemplateInput {
  workspaceId: string
  name: string
  channelPluginId: string
  providerTemplateName: string
  language: string
  variables: string[]
}

@Injectable()
export class CreateTemplateUseCase {
  constructor(private readonly templates: TemplateRepository) {}

  async execute(input: CreateTemplateInput): Promise<{ id: string; name: string }> {
    const existing = await this.templates.findByName(input.workspaceId, input.name)
    if (existing) throw new DuplicateTemplateException(input.name)

    const { id } = await this.templates.create(input)
    return { id, name: input.name }
  }
}
