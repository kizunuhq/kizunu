import type { CadenceAction, CadenceStepInput } from '@kizunu/api-contracts/cadence'
import { ChannelPluginRegistry } from '@kizunu/api/modules/channel/core/plugin/channel-plugin-registry'
import { Injectable } from '@nestjs/common'

import { CadenceRepository } from '../../persistence/cadence.repository'
import { TemplateRepository } from '../../persistence/template.repository'
import { validateCadenceSteps } from '../domain/cadence-validator'
import type { SendingWindow } from '../domain/sending-window'

export interface CadenceInput {
  workspaceId: string
  name: string
  status: 'active' | 'inactive'
  stopOnReply: boolean
  steps: CadenceStepInput[]
  onReply: CadenceAction[]
  onExhausted: CadenceAction[]
  onComplete: CadenceAction[]
  sendingWindow: SendingWindow | null
}

@Injectable()
export class CreateCadenceUseCase {
  constructor(
    private readonly registry: ChannelPluginRegistry,
    private readonly templates: TemplateRepository,
    private readonly cadences: CadenceRepository,
  ) {}

  async execute(input: CadenceInput): Promise<{ id: string; name: string }> {
    await validateCadenceSteps(input.steps, {
      hasPlugin: (pluginId) => this.registry.has(pluginId),
      findTemplate: (templateId) =>
        this.templates.findByIdInWorkspace(templateId, input.workspaceId),
    })
    const { id } = await this.cadences.createWithSteps(
      {
        workspaceId: input.workspaceId,
        name: input.name,
        status: input.status,
        stopOnReply: input.stopOnReply,
        onReply: input.onReply,
        onExhausted: input.onExhausted,
        onComplete: input.onComplete,
        sendingWindow: input.sendingWindow,
      },
      input.steps,
    )
    return { id, name: input.name }
  }
}
