import type { CadenceStepInput } from '@kizunu/api-contracts/cadence'
import { UnknownChannelPluginException } from '@kizunu/api/modules/channel/core/errors/channel.errors'

import { EmptyCadenceException, TemplateChannelMismatchException } from '../errors/cadence.errors'
import { TemplateNotFoundException } from '../errors/template.errors'

export interface CadenceValidationDeps {
  hasPlugin: (pluginId: string) => boolean
  findTemplate: (templateId: string) => Promise<{ channelPluginId: string } | undefined>
}

async function validateStepTemplate(
  step: CadenceStepInput,
  findTemplate: CadenceValidationDeps['findTemplate'],
): Promise<void> {
  if (!step.templateId) return
  const template = await findTemplate(step.templateId)
  if (!template) throw new TemplateNotFoundException(step.templateId)
  if (template.channelPluginId !== step.channelPluginId) {
    throw new TemplateChannelMismatchException(step.templateId)
  }
}

/**
 * Validates a cadence's steps against the live plugin registry and the workspace's
 * templates. Pure over its injected lookups (no DI), so it is unit-testable and reused
 * by both create and update. Throws a nominated error on the first violation.
 */
export async function validateCadenceSteps(
  steps: CadenceStepInput[],
  deps: CadenceValidationDeps,
): Promise<void> {
  if (steps.length === 0) throw new EmptyCadenceException()
  for (const step of steps) {
    if (!deps.hasPlugin(step.channelPluginId)) {
      throw new UnknownChannelPluginException(step.channelPluginId)
    }
    await validateStepTemplate(step, deps.findTemplate)
  }
}
