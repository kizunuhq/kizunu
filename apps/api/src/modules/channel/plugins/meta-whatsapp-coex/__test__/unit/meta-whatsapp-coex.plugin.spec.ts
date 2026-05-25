import { buildMetaWhatsappCoexPlugin } from '@kizunu/api/modules/channel/plugins/meta-whatsapp-coex/meta-whatsapp-coex.plugin'
import { describe, expect, it, vi } from 'vite-plus/test'

vi.mock('@kizunu/api/modules/channel/plugins/meta-whatsapp/meta-coex-token', () => ({
  exchangeForRefreshedToken: vi.fn(),
}))
vi.mock('@kizunu/api/modules/channel/plugins/meta-whatsapp/meta-directory', () => ({
  listMetaTemplates: vi.fn(),
  listMetaPhoneNumbers: vi.fn(),
}))

import { exchangeForRefreshedToken } from '@kizunu/api/modules/channel/plugins/meta-whatsapp/meta-coex-token'
import {
  listMetaPhoneNumbers,
  listMetaTemplates,
} from '@kizunu/api/modules/channel/plugins/meta-whatsapp/meta-directory'

const baseCredentials = {
  channelMode: 'coexistence' as const,
  wabaId: 'waba-1',
  phoneNumberId: 'phone-1',
  verifyToken: 'verify-1',
  accessToken: 'access-1',
}

const now = new Date('2026-05-22T12:00:00.000Z')
const HOUR_MS = 60 * 60 * 1000

describe('MetaWhatsappCoexPlugin', () => {
  describe('manifest', () => {
    it('has id meta-whatsapp-coex with OAuth connect descriptor', () => {
      const plugin = buildMetaWhatsappCoexPlugin()

      expect(plugin.manifest.id).toBe('meta-whatsapp-coex')
      expect(plugin.manifest.name).toBe('WhatsApp (Coex / Embedded Signup)')
      expect(plugin.manifest.connect).toEqual({ kind: 'oauth', provider: 'meta-coex' })
    })

    it('declares freeform and template capabilities', () => {
      const plugin = buildMetaWhatsappCoexPlugin()

      expect(plugin.manifest.capabilities).toEqual(['freeform', 'template'])
    })
  })

  describe('validate (24h customer-service window)', () => {
    const plugin = buildMetaWhatsappCoexPlugin()

    it('allows freeform when the last inbound is within the window', () => {
      const lastInboundAt = new Date(now.getTime() - HOUR_MS)

      expect(
        plugin.validate({ now, lastInboundAt, hasApprovedTemplate: false, capabilities: [] }),
      ).toEqual({ action: 'send', mode: 'freeform' })
    })

    it('requires a template once the window has closed', () => {
      const lastInboundAt = new Date(now.getTime() - 25 * HOUR_MS)

      expect(
        plugin.validate({ now, lastInboundAt, hasApprovedTemplate: true, capabilities: [] }),
      ).toEqual({ action: 'send', mode: 'template' })
    })

    it('errors with template_required outside the window when no template applies', () => {
      expect(plugin.validate({ now, hasApprovedTemplate: false, capabilities: [] })).toEqual({
        action: 'error',
        reason: 'template_required',
      })
    })
  })

  describe('refreshCredentials', () => {
    it('calls exchangeForRefreshedToken and merges the new access token', async () => {
      const mockExchange = vi.mocked(exchangeForRefreshedToken)
      mockExchange.mockResolvedValueOnce({
        accessToken: 'new-token',
        accessTokenExpiresAt: '2026-08-01T00:00:00.000Z',
      })
      const plugin = buildMetaWhatsappCoexPlugin({
        config: { appId: 'app-x', appSecret: 'secret-x' },
      })

      const result = await plugin.refreshCredentials!({
        channelAccountId: 'channel-1',
        credentials: baseCredentials,
      })

      expect(mockExchange).toHaveBeenCalledWith(
        expect.objectContaining({ currentToken: 'access-1' }),
      )
      expect(result.accessToken).toBe('new-token')
      expect(result.accessTokenExpiresAt).toBe('2026-08-01T00:00:00.000Z')
      expect(result.wabaId).toBe('waba-1')
    })
  })

  describe('directory', () => {
    it('dispatches to listMetaTemplates for the templates resource', async () => {
      const plugin = buildMetaWhatsappCoexPlugin()
      vi.mocked(listMetaTemplates).mockResolvedValueOnce({ items: [], meta: { truncated: false } })

      await plugin.directory!({
        accountId: 'account-1',
        resource: 'templates',
        credentials: baseCredentials,
      })

      expect(listMetaTemplates).toHaveBeenCalled()
    })

    it('dispatches to listMetaPhoneNumbers for the phoneNumbers resource', async () => {
      const plugin = buildMetaWhatsappCoexPlugin()
      vi.mocked(listMetaPhoneNumbers).mockResolvedValueOnce({
        items: [],
        meta: { truncated: false },
      })

      await plugin.directory!({
        accountId: 'account-1',
        resource: 'phoneNumbers',
        credentials: baseCredentials,
      })

      expect(listMetaPhoneNumbers).toHaveBeenCalled()
    })

    it('throws ConnectorDirectoryUnsupportedException for unknown resources', async () => {
      const plugin = buildMetaWhatsappCoexPlugin()

      await expect(
        plugin.directory!({
          accountId: 'account-1',
          resource: 'unknown',
          credentials: baseCredentials,
        }),
      ).rejects.toMatchObject({ code: 'connector.directory-unsupported' })
    })
  })
})
