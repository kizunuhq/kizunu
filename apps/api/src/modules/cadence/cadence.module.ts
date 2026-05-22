import { Module } from '@nestjs/common'

import { ChannelModule } from '../channel/channel.module'
import { WorkspaceModule } from '../workspace/workspace.module'
import { CreateCadenceUseCase } from './core/use-cases/create-cadence.use-case'
import { CreateTemplateUseCase } from './core/use-cases/create-template.use-case'
import { DeleteCadenceUseCase } from './core/use-cases/delete-cadence.use-case'
import { DeleteTemplateUseCase } from './core/use-cases/delete-template.use-case'
import { GetCadenceUseCase } from './core/use-cases/get-cadence.use-case'
import { ListCadencesUseCase } from './core/use-cases/list-cadences.use-case'
import { ListWorkspaceTemplatesUseCase } from './core/use-cases/list-workspace-templates.use-case'
import { UpdateCadenceUseCase } from './core/use-cases/update-cadence.use-case'
import { UpdateTemplateUseCase } from './core/use-cases/update-template.use-case'
import { CadenceController } from './http/controllers/cadence.controller'
import { TemplateController } from './http/controllers/template.controller'
import { CadenceRepository } from './persistence/cadence.repository'
import { TemplateRepository } from './persistence/template.repository'

@Module({
  imports: [WorkspaceModule, ChannelModule],
  controllers: [TemplateController, CadenceController],
  providers: [
    TemplateRepository,
    CadenceRepository,
    CreateTemplateUseCase,
    ListWorkspaceTemplatesUseCase,
    UpdateTemplateUseCase,
    DeleteTemplateUseCase,
    CreateCadenceUseCase,
    ListCadencesUseCase,
    GetCadenceUseCase,
    UpdateCadenceUseCase,
    DeleteCadenceUseCase,
  ],
  exports: [TemplateRepository, CadenceRepository],
})
export class CadenceModule {}
