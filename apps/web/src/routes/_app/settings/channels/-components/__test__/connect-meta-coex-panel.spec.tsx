import { ConnectMetaCoexPanel } from '@kizunu/web/routes/_app/settings/channels/-components/connect-meta-coex-panel'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vite-plus/test'

vi.mock('@kizunu/api-client/channel/use-connect-meta-coex', () => ({
  useConnectMetaCoex: () => ({ connectMetaCoex: vi.fn(), isPending: false }),
}))

const BASE_PROPS = {
  workspaceId: 'ws-1',
  appId: 'app-123',
  coexConfigId: 'config-abc',
  isPending: false,
  onSuccess: vi.fn(),
  onError: vi.fn(),
}

describe('ConnectMetaCoexPanel', () => {
  it('renders the not-configured message when appId is empty', () => {
    render(<ConnectMetaCoexPanel {...BASE_PROPS} appId="" />)

    expect(screen.getByText(/not configured for this deployment/i)).toBeInTheDocument()
    expect(document.getElementById('facebook-jssdk')).toBeNull()
  })

  it('renders the not-configured message when coexConfigId is empty', () => {
    render(<ConnectMetaCoexPanel {...BASE_PROPS} coexConfigId="" />)

    expect(screen.getByText(/not configured for this deployment/i)).toBeInTheDocument()
    expect(document.getElementById('facebook-jssdk')).toBeNull()
  })

  it('renders the Connect button when env is present', () => {
    render(<ConnectMetaCoexPanel {...BASE_PROPS} />)

    expect(screen.getByRole('button', { name: /connect whatsapp business/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /finish connect/i })).toBeInTheDocument()
  })

  it('disables the Finish connect button until the signup flow completes', () => {
    render(<ConnectMetaCoexPanel {...BASE_PROPS} />)

    expect(screen.getByRole('button', { name: /finish connect/i })).toBeDisabled()
  })

  it('disables buttons while isPending is true', () => {
    render(<ConnectMetaCoexPanel {...BASE_PROPS} isPending />)

    expect(screen.getByRole('button', { name: /connect whatsapp business/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /finish connect/i })).toBeDisabled()
  })
})
