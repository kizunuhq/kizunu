import { ChannelPluginRegistry } from '@kizunu/api/modules/channel/core/plugin/channel-plugin-registry'
import { Injectable } from '@nestjs/common'

import { CadenceRepository } from '../../persistence/cadence.repository'
import { TemplateRepository } from '../../persistence/template.repository'
import { validateCadenceSteps } from '../domain/cadence-validator'
import { CadenceNotFoundException } from '../errors/cadence.errors'
import type { CadenceInput } from './create-cadence.use-case'

export interface UpdateCadenceInput extends CadenceInput {
  cadenceId: string
}

@Injectable()
export class UpdateCadenceUseCase {
  constructor(
    private readonly registry: ChannelPluginRegistry,
    private readonly templates: TemplateRepository,
    private readonly cadences: CadenceRepository,
  ) {}

  async execute(input: UpdateCadenceInput): Promise<void> {
    const existing = await this.cadences.findByIdInWorkspace(input.cadenceId, input.workspaceId)
    if (!existing) throw new CadenceNotFoundException(input.cadenceId)

    await validateCadenceSteps(input.steps, {
      hasPlugin: (pluginId) => this.registry.has(pluginId),
      findTemplate: (templateId) =>
        this.templates.findByIdInWorkspace(templateId, input.workspaceId),
    })
    await this.cadences.updateWithSteps(
      input.cadenceId,
      {
        name: input.name,
        status: input.status,
        stopOnReply: input.stopOnReply,
        onReply: input.onReply,
        onExhausted: input.onExhausted,
        onComplete: input.onComplete,
      },
      input.steps,
    )
  }
}
