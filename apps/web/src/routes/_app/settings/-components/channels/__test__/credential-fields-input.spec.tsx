import type { ChannelCredentialField } from '@kizunu/api-contracts/channel'
import { CredentialFieldsInput } from '@kizunu/web/routes/_app/settings/-components/channels/credential-fields-input'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vite-plus/test'

const fields: ChannelCredentialField[] = [
  { key: 'wabaId', label: 'WABA ID', type: 'text', required: true },
  { key: 'systemToken', label: 'System token', type: 'secret', required: true },
]

describe('CredentialFieldsInput', () => {
  it('renders one labelled input per declared field', () => {
    render(<CredentialFieldsInput fields={fields} values={{}} onChange={() => {}} />)

    expect(screen.getByLabelText('WABA ID')).toBeInTheDocument()
    expect(screen.getByLabelText('System token')).toBeInTheDocument()
  })

  it('masks a secret field and leaves a text field visible', () => {
    render(<CredentialFieldsInput fields={fields} values={{}} onChange={() => {}} />)

    expect(screen.getByLabelText('System token')).toHaveAttribute('type', 'password')
    expect(screen.getByLabelText('WABA ID')).toHaveAttribute('type', 'text')
  })

  it('shows the provided value for a field', () => {
    render(
      <CredentialFieldsInput fields={fields} values={{ wabaId: 'waba-9' }} onChange={() => {}} />,
    )

    expect(screen.getByLabelText('WABA ID')).toHaveValue('waba-9')
  })
})
