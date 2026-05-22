import { Module } from '@nestjs/common'

import { WorkspaceModule } from '../workspace/workspace.module'
import { CreateTemplateUseCase } from './core/use-cases/create-template.use-case'
import { DeleteTemplateUseCase } from './core/use-cases/delete-template.use-case'
import { ListWorkspaceTemplatesUseCase } from './core/use-cases/list-workspace-templates.use-case'
import { UpdateTemplateUseCase } from './core/use-cases/update-template.use-case'
import { TemplateController } from './http/controllers/template.controller'
import { TemplateRepository } from './persistence/template.repository'

@Module({
  imports: [WorkspaceModule],
  controllers: [TemplateController],
  providers: [
    TemplateRepository,
    CreateTemplateUseCase,
    ListWorkspaceTemplatesUseCase,
    UpdateTemplateUseCase,
    DeleteTemplateUseCase,
  ],
  exports: [TemplateRepository],
})
export class CadenceModule {}
