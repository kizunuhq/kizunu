import type { ChannelDecision } from '@kizunu/api/modules/channel/core/plugin/channel-decision'
import type { ValidateInput } from '@kizunu/api/modules/channel/core/plugin/validate-input'

import { isWithinServiceWindow } from './customer-service-window'

export function decideMetaAction(input: ValidateInput): ChannelDecision {
  if (isWithinServiceWindow(input.now, input.lastInboundAt)) {
    return { action: 'send', mode: 'freeform' }
  }
  if (input.hasApprovedTemplate) {
    return { action: 'send', mode: 'template' }
  }
  return { action: 'error', reason: 'template_required' }
}
