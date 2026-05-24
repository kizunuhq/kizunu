import { MetaWhatsappPlugin } from '@kizunu/api/modules/channel/plugins/meta-whatsapp/meta-whatsapp.plugin'
import { describe, expect, it, vi } from 'vite-plus/test'

const credentials = {
  channelMode: 'cloud_api' as const,
  appId: 'app-1',
  appSecret: 'app-secret-1',
  wabaId: 'waba-1',
  phoneNumberId: 'phone-1',
  systemToken: 'token-1',
  verifyToken: 'verify-token-1',
}
const now = new Date('2026-05-22T12:00:00.000Z')
const HOUR_MS = 60 * 60 * 1000

function pluginWithFetch(response: Response) {
  const fetchFn = vi.fn(async (_input: string | URL | Request, _init?: RequestInit) => response)
  const plugin = new MetaWhatsappPlugin({ baseUrl: 'https://graph.test/v21.0', fetchFn })
  return { plugin, fetchFn }
}

describe('MetaWhatsappPlugin', () => {
  describe('manifest', () => {
    it('declares meta-whatsapp with freeform and template capabilities', () => {
      const plugin = new MetaWhatsappPlugin()

      expect(plugin.manifest.id).toBe('meta-whatsapp')
      expect(plugin.manifest.capabilities).toEqual(['freeform', 'template'])
    })
  })

  describe('validate (24h customer-service window)', () => {
    const plugin = new MetaWhatsappPlugin()

    it('allows freeform when the last inbound is within the window', () => {
      const lastInboundAt = new Date(now.getTime() - HOUR_MS)

      expect(
        plugin.validate({ now, lastInboundAt, hasApprovedTemplate: false, capabilities: [] }),
      ).toEqual({
        action: 'send',
        mode: 'freeform',
      })
    })

    it('treats exactly 24h since the last inbound as still inside the window', () => {
      const lastInboundAt = new Date(now.getTime() - 24 * HOUR_MS)

      expect(
        plugin.validate({ now, lastInboundAt, hasApprovedTemplate: false, capabilities: [] }).mode,
      ).toBe('freeform')
    })

    it('requires a template once the window has closed', () => {
      const lastInboundAt = new Date(now.getTime() - 25 * HOUR_MS)

      expect(
        plugin.validate({ now, lastInboundAt, hasApprovedTemplate: true, capabilities: [] }),
      ).toEqual({
        action: 'send',
        mode: 'template',
      })
    })

    it('errors with template_required outside the window when no template applies', () => {
      expect(plugin.validate({ now, hasApprovedTemplate: false, capabilities: [] })).toEqual({
        action: 'error',
        reason: 'template_required',
      })
    })
  })

  describe('parseInbound', () => {
    const plugin = new MetaWhatsappPlugin()

    it('normalizes a text message with the phone_number_id as the routing key', async () => {
      const raw = {
        entry: [
          {
            changes: [
              {
                value: {
                  metadata: { phone_number_id: 'phone-1' },
                  messages: [
                    {
                      id: 'wamid.1',
                      from: '5511999',
                      timestamp: '1700000000',
                      text: { body: 'hi' },
                    },
                  ],
                },
              },
            ],
          },
        ],
      }

      const messages = await plugin.parseInbound(raw)

      expect(messages).toEqual([
        {
          externalMessageId: 'wamid.1',
          fromExternalId: '5511999',
          toExternalId: 'phone-1',
          body: 'hi',
          ts: new Date(1700000000 * 1000),
        },
      ])
    })

    it('returns no messages for a status-only payload', async () => {
      const raw = {
        entry: [
          { changes: [{ value: { metadata: { phone_number_id: 'phone-1' }, statuses: [] } }] },
        ],
      }

      expect(await plugin.parseInbound(raw)).toEqual([])
    })

    it('returns no messages for a malformed payload instead of throwing', async () => {
      expect(await plugin.parseInbound({ junk: true })).toEqual([])
      expect(await plugin.parseInbound('not-json')).toEqual([])
    })
  })

  describe('send', () => {
    it('posts a text message and maps the returned message id', async () => {
      const { plugin, fetchFn } = pluginWithFetch(
        new Response(JSON.stringify({ messages: [{ id: 'wamid.out' }] }), { status: 200 }),
      )

      const result = await plugin.send(
        { to: '5511999', mode: 'freeform', body: 'hello' },
        credentials,
      )

      expect(result).toEqual({ externalMessageId: 'wamid.out', status: 'sent' })
      const [url, init] = fetchFn.mock.calls[0]!
      expect(url).toBe('https://graph.test/v21.0/phone-1/messages')
      expect(JSON.parse(init!.body as string)).toMatchObject({
        type: 'text',
        text: { body: 'hello' },
      })
    })

    it('posts a template message with name, language, and variables', async () => {
      const { plugin, fetchFn } = pluginWithFetch(
        new Response(JSON.stringify({ messages: [{ id: 'wamid.tpl' }] }), { status: 200 }),
      )

      await plugin.send(
        {
          to: '5511999',
          mode: 'template',
          template: { name: 'followup_1', language: 'en_US', variables: { 1: 'Ada' } },
        },
        credentials,
      )

      const body = JSON.parse(fetchFn.mock.calls[0]![1]!.body as string)
      expect(body.type).toBe('template')
      expect(body.template).toMatchObject({ name: 'followup_1', language: { code: 'en_US' } })
    })

    it('maps named variables onto positional Meta HSM body components in insertion order', async () => {
      const { plugin, fetchFn } = pluginWithFetch(
        new Response(JSON.stringify({ messages: [{ id: 'wamid.tpl' }] }), { status: 200 }),
      )

      await plugin.send(
        {
          to: '5511999',
          mode: 'template',
          template: {
            name: 'followup_2',
            language: 'pt_BR',
            variables: { leadFirstName: 'Ada', leadName: 'Ada Lovelace' },
          },
        },
        credentials,
      )

      const body = JSON.parse(fetchFn.mock.calls[0]![1]!.body as string)
      expect(body.template.components).toEqual([
        {
          type: 'body',
          parameters: [
            { type: 'text', text: 'Ada' },
            { type: 'text', text: 'Ada Lovelace' },
          ],
        },
      ])
    })

    it('omits components when the template has no variables', async () => {
      const { plugin, fetchFn } = pluginWithFetch(
        new Response(JSON.stringify({ messages: [{ id: 'wamid.tpl' }] }), { status: 200 }),
      )

      await plugin.send(
        {
          to: '5511999',
          mode: 'template',
          template: { name: 'followup_3', language: 'en_US' },
        },
        credentials,
      )

      const body = JSON.parse(fetchFn.mock.calls[0]![1]!.body as string)
      expect(body.template).not.toHaveProperty('components')
    })

    it('reports failure when the Graph API responds non-ok', async () => {
      const { plugin } = pluginWithFetch(
        new Response(JSON.stringify({ error: { message: 'invalid token' } }), { status: 401 }),
      )

      const result = await plugin.send({ to: '5511999', mode: 'freeform', body: 'hi' }, credentials)

      expect(result).toEqual({ externalMessageId: '', status: 'failed', error: 'invalid token' })
    })
  })

  describe('onAccountCreated', () => {
    const clientCredentials = {
      appId: 'app-1',
      appSecret: 'app-secret-1',
      wabaId: 'waba-1',
      phoneNumberId: 'phone-1',
      systemToken: 'token-1',
    }

    function pluginWithSubscribeResponses(responses: { status: number; body?: unknown }[]) {
      const queue = [...responses]
      const fetchFn = vi.fn(async (_input: string | URL | Request, _init?: RequestInit) => {
        const next = queue.shift() ?? { status: 200, body: { success: true } }
        return new Response(JSON.stringify(next.body ?? {}), {
          status: next.status,
          headers: { 'Content-Type': 'application/json' },
        })
      })
      const plugin = new MetaWhatsappPlugin({ baseUrl: 'https://graph.test/v21.0', fetchFn })
      return { plugin, fetchFn }
    }

    it('subscribes both webhook legs and returns credentials enriched with verifyToken', async () => {
      const { plugin, fetchFn } = pluginWithSubscribeResponses([
        { status: 200, body: { success: true } },
        { status: 200, body: { success: true } },
      ])

      const result = (await plugin.onAccountCreated({
        channelAccountId: 'channel-1',
        appUrl: 'https://api.example',
        credentials: clientCredentials,
      })) as Record<string, string>

      expect(fetchFn).toHaveBeenCalledTimes(2)
      expect(result.appId).toBe('app-1')
      expect(result.wabaId).toBe('waba-1')
      expect(result.verifyToken).toMatch(/^[0-9a-f]{64}$/)
    })

    it('surfaces step: app-subscription when the app-level call fails', async () => {
      const { plugin } = pluginWithSubscribeResponses([
        { status: 400, body: { error: { message: 'invalid app secret' } } },
      ])

      await expect(
        plugin.onAccountCreated({
          channelAccountId: 'channel-1',
          appUrl: 'https://api.example',
          credentials: clientCredentials,
        }),
      ).rejects.toMatchObject({
        code: 'channel.meta-subscription-failed',
        context: { step: 'app-subscription', metaError: 'invalid app secret' },
      })
    })

    it('surfaces step: waba-subscription when the per-WABA call fails', async () => {
      const { plugin } = pluginWithSubscribeResponses([
        { status: 200, body: { success: true } },
        { status: 200, body: { success: false, error: { message: 'waba locked' } } },
      ])

      await expect(
        plugin.onAccountCreated({
          channelAccountId: 'channel-1',
          appUrl: 'https://api.example',
          credentials: clientCredentials,
        }),
      ).rejects.toMatchObject({
        code: 'channel.meta-subscription-failed',
        context: { step: 'waba-subscription', metaError: 'waba locked' },
      })
    })

    it('rejects client credentials that include the server-generated verifyToken', async () => {
      const { plugin } = pluginWithSubscribeResponses([
        { status: 200, body: { success: true } },
        { status: 200, body: { success: true } },
      ])

      await expect(
        plugin.onAccountCreated({
          channelAccountId: 'channel-1',
          appUrl: 'https://api.example',
          credentials: { ...clientCredentials, verifyToken: 'forged' },
        }),
      ).rejects.toBeInstanceOf(Error)
    })
  })

  describe('onAccountCreated (coexistence)', () => {
    const coexInput = {
      channelMode: 'coexistence' as const,
      wabaId: 'waba-coex',
      phoneNumberId: 'phone-coex',
      accessToken: 'biz-token',
      accessTokenExpiresAt: '2026-07-22T00:00:00.000Z',
    }

    it('runs ONLY the per-WABA subscription with Coex subscribed_fields', async () => {
      const responses = [{ status: 200, body: { success: true } }]
      const fetchFn = vi.fn(async (_input: string | URL | Request, _init?: RequestInit) => {
        const next = responses.shift() ?? { status: 200, body: { success: true } }
        return new Response(JSON.stringify(next.body), { status: next.status })
      })
      const plugin = new MetaWhatsappPlugin({
        baseUrl: 'https://graph.test/v21.0',
        fetchFn,
        config: { appId: 'app-x', appSecret: 'secret-x' },
      })

      const result = (await plugin.onAccountCreated({
        channelAccountId: 'channel-1',
        appUrl: 'https://api.example',
        credentials: coexInput,
      })) as Record<string, string>

      expect(fetchFn).toHaveBeenCalledTimes(1) // ONLY waba subscription, no app-level call
      const url = fetchFn.mock.calls[0]![0] as string
      expect(url).toBe('https://graph.test/v21.0/waba-coex/subscribed_apps')
      const body = new URLSearchParams(fetchFn.mock.calls[0]![1]!.body as string)
      expect(body.get('subscribed_fields')).toBe('messages,smb_message_echoes,smb_app_state_sync')
      expect(body.get('access_token')).toBe('biz-token')
      expect(result.channelMode).toBe('coexistence')
      expect(result.accessToken).toBe('biz-token')
      expect(result.verifyToken).toMatch(/^[0-9a-f]{64}$/)
    })
  })

  describe('refreshCredentials', () => {
    it('passes cloud_api credentials through unchanged (no expiry)', async () => {
      const fetchFn = vi.fn() as never
      const plugin = new MetaWhatsappPlugin({ baseUrl: 'https://graph.test/v21.0', fetchFn })

      const result = await plugin.refreshCredentials({
        channelAccountId: 'channel-1',
        credentials,
      })

      expect(result).toEqual(credentials)
    })

    it('exchanges the current Coex token for a refreshed one', async () => {
      const fetchFn = vi.fn(async (_input: string | URL | Request) => {
        return new Response(JSON.stringify({ access_token: 'rolled', expires_in: 60 }), {
          status: 200,
        })
      })
      const plugin = new MetaWhatsappPlugin({
        baseUrl: 'https://graph.test/v21.0',
        fetchFn,
        config: { appId: 'app-x', appSecret: 'secret-x' },
      })

      const result = (await plugin.refreshCredentials({
        channelAccountId: 'channel-1',
        credentials: {
          channelMode: 'coexistence',
          wabaId: 'w',
          phoneNumberId: 'p',
          verifyToken: 'v',
          accessToken: 'old-token',
        },
      })) as Record<string, string>

      expect(result.accessToken).toBe('rolled')
      expect(typeof result.accessTokenExpiresAt).toBe('string')
    })

    it('throws MetaConnectFailedException with refresh-exchange step when Meta rejects', async () => {
      const fetchFn = vi.fn(async () => new Response(JSON.stringify({}), { status: 401 }))
      const plugin = new MetaWhatsappPlugin({
        baseUrl: 'https://graph.test/v21.0',
        fetchFn,
        config: { appId: 'a', appSecret: 's' },
      })

      await expect(
        plugin.refreshCredentials({
          channelAccountId: 'channel-1',
          credentials: {
            channelMode: 'coexistence',
            wabaId: 'w',
            phoneNumberId: 'p',
            verifyToken: 'v',
            accessToken: 'expired',
          },
        }),
      ).rejects.toMatchObject({
        code: 'channel.meta-connect-failed',
        context: { step: 'refresh-exchange', metaStatus: 401 },
      })
    })
  })

  describe('parseInbound (Coex echoes)', () => {
    const plugin = new MetaWhatsappPlugin()

    it('parses smb_message_echoes with customer phone as fromExternalId', async () => {
      const messages = await plugin.parseInbound({
        entry: [
          {
            changes: [
              {
                field: 'smb_message_echoes',
                value: {
                  message_echoes: [
                    {
                      from: 'business-number',
                      to: 'customer-phone',
                      id: 'wamid.echo.1',
                      timestamp: '1700000000',
                      text: { body: 'manual reply' },
                    },
                  ],
                },
              },
            ],
          },
        ],
      })

      expect(messages).toEqual([
        {
          externalMessageId: 'wamid.echo.1',
          fromExternalId: 'customer-phone',
          toExternalId: 'business-number',
          body: 'manual reply',
          ts: new Date(1700000000 * 1000),
        },
      ])
    })

    it('returns [] for smb_app_state_sync and history fields (200-ack only)', async () => {
      const stateSync = await plugin.parseInbound({
        entry: [
          {
            changes: [
              {
                field: 'smb_app_state_sync',
                value: { state_sync: [{ type: 'contact', action: 'add' }] },
              },
            ],
          },
        ],
      })
      const history = await plugin.parseInbound({
        entry: [{ changes: [{ field: 'history', value: { messages: [] } }] }],
      })

      expect(stateSync).toEqual([])
      expect(history).toEqual([])
    })
  })
})
