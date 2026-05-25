import { ConnectorAccountFormBody } from '@kizunu/web/routes/_app/settings/connectors/-components/connector-account-form-body'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vite-plus/test'

const PIPEDRIVE_FIELDS = [
  { key: 'apiToken', label: 'API token', type: 'secret' as const, required: true },
  { key: 'companyDomain', label: 'Company domain', type: 'text' as const, required: false },
  { key: 'activityType', label: 'Activity type', type: 'text' as const, required: false },
  { key: 'phoneFieldKey', label: 'Phone field key', type: 'text' as const, required: false },
]

const FORM_ID = 'connector-account-form'

function submitForm() {
  const form = document.getElementById(FORM_ID)
  if (!(form instanceof HTMLFormElement)) throw new Error('form not found')
  fireEvent.submit(form)
}

describe('ConnectorAccountFormBody — Pipedrive', () => {
  it('renders only required fields at the primary level by default', () => {
    render(
      <ConnectorAccountFormBody
        formId={FORM_ID}
        connectorId="pipedrive"
        fields={PIPEDRIVE_FIELDS}
        isPending={false}
        onSubmit={() => {}}
      />,
    )

    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByLabelText('API token')).toBeInTheDocument()

    expect(screen.getByText('Advanced settings')).toBeInTheDocument()
    const details = screen.getByText('Advanced settings').closest('details')
    expect(details).not.toBeNull()
    expect(details?.open).toBe(false)
  })

  it('reveals optional fields when the operator opens Advanced settings', () => {
    render(
      <ConnectorAccountFormBody
        formId={FORM_ID}
        connectorId="pipedrive"
        fields={PIPEDRIVE_FIELDS}
        isPending={false}
        onSubmit={() => {}}
      />,
    )

    const summary = screen.getByText('Advanced settings')
    fireEvent.click(summary)

    expect(screen.getByLabelText('Company domain')).toBeInTheDocument()
    expect(screen.getByLabelText('Activity type')).toBeInTheDocument()
    expect(screen.getByLabelText('Phone field key')).toBeInTheDocument()
  })

  it('submits with only apiToken when Advanced settings are untouched', async () => {
    const onSubmit = vi.fn()
    render(
      <ConnectorAccountFormBody
        formId={FORM_ID}
        connectorId="pipedrive"
        fields={PIPEDRIVE_FIELDS}
        isPending={false}
        onSubmit={onSubmit}
      />,
    )

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Acme Pipedrive' } })
    fireEvent.change(screen.getByLabelText('API token'), { target: { value: 'tok-1' } })
    submitForm()

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        connectorId: 'pipedrive',
        name: 'Acme Pipedrive',
        credentials: { apiToken: 'tok-1', activityType: 'task' },
      })
    })
  })

  it('submits with companyDomain when the operator fills it under Advanced settings', async () => {
    const onSubmit = vi.fn()
    render(
      <ConnectorAccountFormBody
        formId={FORM_ID}
        connectorId="pipedrive"
        fields={PIPEDRIVE_FIELDS}
        isPending={false}
        onSubmit={onSubmit}
      />,
    )

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Acme Pipedrive' } })
    fireEvent.change(screen.getByLabelText('API token'), { target: { value: 'tok-1' } })
    fireEvent.click(screen.getByText('Advanced settings'))
    fireEvent.change(screen.getByLabelText('Company domain'), { target: { value: 'custom-host' } })
    submitForm()

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        connectorId: 'pipedrive',
        name: 'Acme Pipedrive',
        credentials: {
          apiToken: 'tok-1',
          companyDomain: 'custom-host',
          activityType: 'task',
        },
      })
    })
  })

  it('rejects submit when the API token is empty', async () => {
    const onSubmit = vi.fn()
    render(
      <ConnectorAccountFormBody
        formId={FORM_ID}
        connectorId="pipedrive"
        fields={PIPEDRIVE_FIELDS}
        isPending={false}
        onSubmit={onSubmit}
      />,
    )

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Acme Pipedrive' } })
    submitForm()

    await waitFor(() => {
      expect(screen.getByLabelText('API token')).toHaveAttribute('aria-invalid', 'true')
    })
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
