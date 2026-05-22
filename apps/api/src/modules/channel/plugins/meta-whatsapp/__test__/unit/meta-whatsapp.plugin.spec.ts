import { MetaWhatsappPlugin } from '@kizunu/api/modules/channel/plugins/meta-whatsapp/meta-whatsapp.plugin'
import { describe, expect, it, vi } from 'vite-plus/test'

const credentials = { wabaId: 'waba-1', phoneNumberId: 'phone-1', systemToken: 'token-1' }
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

    it('reports failure when the Graph API responds non-ok', async () => {
      const { plugin } = pluginWithFetch(
        new Response(JSON.stringify({ error: { message: 'invalid token' } }), { status: 401 }),
      )

      const result = await plugin.send({ to: '5511999', mode: 'freeform', body: 'hi' }, credentials)

      expect(result).toEqual({ externalMessageId: '', status: 'failed', error: 'invalid token' })
    })
  })
})
