import type { CadenceAction } from '@kizunu/api-contracts/cadence'
import type { CrmConnectorRegistry } from '@kizunu/api/modules/crm/core/connector/crm-connector-registry'
import { CadenceActionExecutor } from '@kizunu/api/modules/engine/core/services/cadence-action-executor'
import { describe, expect, it } from 'vite-plus/test'

function buildRegistry() {
  const calls: Array<{ method: string; args: unknown[] }> = []
  const record =
    (method: string) =>
    async (...args: unknown[]) => {
      calls.push({ method, args })
      return { externalActivityId: 'activity-1' }
    }
  const registry = {
    moveStage: record('moveStage'),
    markLost: record('markLost'),
    logActivity: record('logActivity'),
    setField: record('setField'),
  } as unknown as CrmConnectorRegistry
  return { calls, registry }
}

const ctx = { connectorId: 'pipedrive', credentials: {}, externalId: 'deal-99' }

describe('CadenceActionExecutor', () => {
  it('routes move_stage and mark_lost through the registry', async () => {
    const { calls, registry } = buildRegistry()
    const actions: CadenceAction[] = [
      { type: 'move_stage', stageId: 'stage-7' },
      { type: 'mark_lost', reason: 'No reply' },
    ]

    await new CadenceActionExecutor(registry).execute(actions, ctx)

    expect(calls.map((c) => c.method)).toEqual(['moveStage', 'markLost'])
  })

  it('routes log_activity and set_field through the registry', async () => {
    const { calls, registry } = buildRegistry()
    const actions: CadenceAction[] = [
      { type: 'log_activity', activityType: 'task', subject: 'Called' },
      { type: 'set_field', key: 'temperature', value: 'cold' },
    ]

    await new CadenceActionExecutor(registry).execute(actions, ctx)

    expect(calls.map((c) => c.method)).toEqual(['logActivity', 'setField'])
  })

  it('treats notify_user as an internal no-op (no registry call)', async () => {
    const { calls, registry } = buildRegistry()

    await new CadenceActionExecutor(registry).execute(
      [{ type: 'notify_user', userId: crypto.randomUUID() }],
      ctx,
    )

    expect(calls).toHaveLength(0)
  })
})
