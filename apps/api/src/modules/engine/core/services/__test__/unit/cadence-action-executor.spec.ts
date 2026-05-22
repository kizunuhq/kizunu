import type { CadenceAction } from '@kizunu/api-contracts/cadence'
import type { CRMConnector } from '@kizunu/api/modules/crm/core/connector/crm-connector'
import { CadenceActionExecutor } from '@kizunu/api/modules/engine/core/services/cadence-action-executor'
import { describe, expect, it } from 'vite-plus/test'

function buildConnector() {
  const calls: Array<{ method: string; args: unknown[] }> = []
  const record =
    (method: string) =>
    async (...args: unknown[]) => {
      calls.push({ method, args })
      return { externalActivityId: 'activity-1' }
    }
  const connector = {
    moveStage: record('moveStage'),
    markLost: record('markLost'),
    logActivity: record('logActivity'),
    setField: record('setField'),
  } as unknown as CRMConnector
  return { calls, connector }
}

const ctx = (connector: CRMConnector) => ({ connector, credentials: {}, externalId: 'deal-99' })

describe('CadenceActionExecutor', () => {
  it('routes move_stage and mark_lost to the connector', async () => {
    const { calls, connector } = buildConnector()
    const actions: CadenceAction[] = [
      { type: 'move_stage', stageId: 'stage-7' },
      { type: 'mark_lost', reason: 'No reply' },
    ]

    await new CadenceActionExecutor().execute(actions, ctx(connector))

    expect(calls.map((c) => c.method)).toEqual(['moveStage', 'markLost'])
  })

  it('routes log_activity and set_field to the connector', async () => {
    const { calls, connector } = buildConnector()
    const actions: CadenceAction[] = [
      { type: 'log_activity', activityType: 'task', subject: 'Called' },
      { type: 'set_field', key: 'temperature', value: 'cold' },
    ]

    await new CadenceActionExecutor().execute(actions, ctx(connector))

    expect(calls.map((c) => c.method)).toEqual(['logActivity', 'setField'])
  })

  it('treats notify_user as an internal no-op (no connector call)', async () => {
    const { calls, connector } = buildConnector()

    await new CadenceActionExecutor().execute(
      [{ type: 'notify_user', userId: crypto.randomUUID() }],
      ctx(connector),
    )

    expect(calls).toHaveLength(0)
  })
})
