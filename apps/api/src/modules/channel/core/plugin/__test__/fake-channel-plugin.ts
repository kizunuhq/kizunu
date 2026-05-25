import { CredentialFieldType } from '@kizunu/api-contracts/shared'
import { z } from 'zod'

import { ChannelCapability } from '../channel-capability'
import type { ChannelDecision } from '../channel-decision'
import type { ChannelPlugin } from '../channel-plugin'
import type { ChannelPluginManifest } from '../channel-plugin-manifest'
import type { InboundMessage } from '../inbound-message'
import type { SendPayload } from '../send-payload'
import type { SendResult } from '../send-result'
import type { ValidateInput } from '../validate-input'

const fakeConfigSchema = z
  .object({
    apiKey: z.string().min(1).meta({ label: 'API key', kind: 'secret' }),
    sender: z.string().min(1).meta({ label: 'Sender', kind: 'text' }),
  })
  .strict()

type FakeCredentials = z.infer<typeof fakeConfigSchema>

/**
 * In-memory plugin used to exercise the registry and channel use-cases without a
 * real provider. Its strict `configSchema` lets tests assert credential validation.
 */
export class FakeChannelPlugin implements ChannelPlugin<typeof fakeConfigSchema> {
  readonly manifest: ChannelPluginManifest<typeof fakeConfigSchema> = {
    id: 'fake',
    name: 'Fake Channel',
    capabilities: [ChannelCapability.Freeform, ChannelCapability.Template],
    configSchema: fakeConfigSchema,
    credentialFields: {
      kind: 'flat',
      fields: [
        { key: 'apiKey', label: 'API key', type: CredentialFieldType.Secret, required: true },
        { key: 'sender', label: 'Sender', type: CredentialFieldType.Text, required: true },
      ],
    },
  }

  async send(_payload: SendPayload, _credentials: FakeCredentials): Promise<SendResult> {
    return { externalMessageId: 'fake-message', status: 'sent' }
  }

  async parseInbound(_raw: unknown, _credentials: FakeCredentials): Promise<InboundMessage[]> {
    return []
  }

  validate(_input: ValidateInput): ChannelDecision {
    return { action: 'send', mode: 'freeform' }
  }
}
