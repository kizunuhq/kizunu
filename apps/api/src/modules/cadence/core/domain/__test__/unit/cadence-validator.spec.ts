import type { CadenceStepInput } from '@kizunu/api-contracts/cadence'
import { validateCadenceSteps } from '@kizunu/api/modules/cadence/core/domain/cadence-validator'
import {
  EmptyCadenceException,
  TemplateChannelMismatchException,
} from '@kizunu/api/modules/cadence/core/errors/cadence.errors'
import { TemplateNotFoundException } from '@kizunu/api/modules/cadence/core/errors/template.errors'
import { UnknownChannelPluginException } from '@kizunu/api/modules/channel/core/errors/channel.errors'
import { describe, expect, it } from 'vite-plus/test'

function step(overrides: Partial<CadenceStepInput> = {}): CadenceStepInput {
  return {
    delayMinutes: 60,
    jitterMinutes: 0,
    channelStrategy: 'lead_owner',
    channelPluginId: 'meta-whatsapp',
    templateId: null,
    ...overrides,
  }
}

const deps = {
  hasPlugin: (id: string) => id === 'meta-whatsapp',
  findTemplate: async (id: string) =>
    id === 'tpl-meta' ? { channelPluginId: 'meta-whatsapp' } : undefined,
}

describe('validateCadenceSteps', () => {
  it('rejects a cadence with no steps', async () => {
    await expect(validateCadenceSteps([], deps)).rejects.toBeInstanceOf(EmptyCadenceException)
  })

  it('rejects a step whose channel plugin is not registered', async () => {
    await expect(
      validateCadenceSteps([step({ channelPluginId: 'telegram' })], deps),
    ).rejects.toBeInstanceOf(UnknownChannelPluginException)
  })

  it('rejects a step referencing a template absent from the workspace', async () => {
    await expect(
      validateCadenceSteps([step({ templateId: 'missing' })], deps),
    ).rejects.toBeInstanceOf(TemplateNotFoundException)
  })

  it('rejects a template that targets a different channel plugin than the step', async () => {
    const mismatchDeps = {
      hasPlugin: () => true,
      findTemplate: async () => ({ channelPluginId: 'telegram' }),
    }

    await expect(
      validateCadenceSteps([step({ templateId: 'tpl-meta' })], mismatchDeps),
    ).rejects.toBeInstanceOf(TemplateChannelMismatchException)
  })

  it('accepts steps with a registered plugin and a matching template', async () => {
    await expect(
      validateCadenceSteps([step(), step({ templateId: 'tpl-meta' })], deps),
    ).resolves.toBeUndefined()
  })
})
