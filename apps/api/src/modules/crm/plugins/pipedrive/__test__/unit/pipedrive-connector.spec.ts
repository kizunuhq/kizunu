import { CrmRequestFailedException } from '@kizunu/api/modules/crm/core/errors/crm.errors'
import { PipedriveConnector } from '@kizunu/api/modules/crm/plugins/pipedrive/pipedrive.connector'
import { describe, expect, it, vi } from 'vite-plus/test'

const credentials = { apiToken: 'token-1', companyDomain: 'acme', activityType: 'task' }

function connectorWithFetch(response: Response) {
  const fetchFn = vi.fn(async (_input: string | URL | Request, _init?: RequestInit) => response)
  const connector = new PipedriveConnector({ baseUrl: 'https://api.test/v1', fetchFn })
  return { connector, fetchFn }
}

describe('PipedriveConnector outbound actions', () => {
  it('logs an activity attributed to the deal owner and returns its id', async () => {
    const { connector, fetchFn } = connectorWithFetch(
      new Response(JSON.stringify({ data: { id: 555 } }), { status: 200 }),
    )

    const result = await connector.logActivity(
      '99',
      { type: 'task', subject: 'Follow-up 1', ownerExternalId: '42' },
      credentials,
    )

    expect(result).toEqual({ externalActivityId: '555' })
    const [url, init] = fetchFn.mock.calls[0]!
    expect(url).toBe('https://api.test/v1/activities?api_token=token-1')
    expect(JSON.parse(init!.body as string)).toMatchObject({
      deal_id: 99,
      user_id: 42,
      type: 'task',
    })
  })

  it('marks a deal lost with a reason', async () => {
    const { connector, fetchFn } = connectorWithFetch(new Response('{}', { status: 200 }))

    await connector.markLost('99', 'No Reply - Follow-up L1', credentials)

    const [url, init] = fetchFn.mock.calls[0]!
    expect(url).toBe('https://api.test/v1/deals/99?api_token=token-1')
    expect(JSON.parse(init!.body as string)).toEqual({
      status: 'lost',
      lost_reason: 'No Reply - Follow-up L1',
    })
  })

  it('moves a deal to a new stage', async () => {
    const { connector, fetchFn } = connectorWithFetch(new Response('{}', { status: 200 }))

    await connector.moveStage('99', { stageId: '7' }, credentials)

    expect(JSON.parse(fetchFn.mock.calls[0]![1]!.body as string)).toEqual({ stage_id: 7 })
  })

  it('raises a CRM error when Pipedrive responds non-ok', async () => {
    const { connector } = connectorWithFetch(new Response('nope', { status: 500 }))

    await expect(connector.moveStage('99', { stageId: '7' }, credentials)).rejects.toBeInstanceOf(
      CrmRequestFailedException,
    )
  })
})
