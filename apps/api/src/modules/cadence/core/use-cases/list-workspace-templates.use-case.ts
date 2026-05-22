import { Injectable } from '@nestjs/common'

import { type TemplateRow, TemplateRepository } from '../../persistence/template.repository'

@Injectable()
export class ListWorkspaceTemplatesUseCase {
  constructor(private readonly templates: TemplateRepository) {}

  async execute(workspaceId: string): Promise<TemplateRow[]> {
    return await this.templates.listByWorkspace(workspaceId)
  }
}
