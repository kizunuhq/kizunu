import { useDryRunDeal } from '@kizunu/api-client/crm/use-dry-run-deal'
import { useWorkspaceConnectors } from '@kizunu/api-client/crm/use-workspace-connectors'
import type { ConnectorHealth } from '@kizunu/api-contracts/crm'
import { LookupSelect } from '@kizunu/web/components/composed/lookup-select'
import { ResourceHealthPill } from '@kizunu/web/components/composed/resource-health-pill'
import { Button } from '@kizunu/web/components/primitives/button'
import { Card, CardContent, CardHeader, CardTitle } from '@kizunu/web/components/primitives/card'
import { Field, FieldLabel } from '@kizunu/web/components/primitives/field'
import { Input } from '@kizunu/web/components/primitives/input'
import { getApiErrorMessage } from '@kizunu/web/lib/get-api-error-message'
import { useState } from 'react'

interface DryRunPanelProps {
  workspaceId: string
}

export function DryRunPanel({ workspaceId }: DryRunPanelProps) {
  const connectors = useWorkspaceConnectors(workspaceId)
  const accounts = connectors.data?.accounts ?? []
  const [accountId, setAccountId] = useState('')
  const [dealId, setDealId] = useState('')
  const [result, setResult] = useState<ConnectorHealth | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { dryRunDeal, isPending } = useDryRunDeal(workspaceId, {
    onSuccess: (health) => {
      setResult(health)
      setError(null)
    },
    onError: (err) => {
      setResult(null)
      setError(getApiErrorMessage(err))
    },
  })

  const activeAccountId = accountId || accounts[0]?.id || ''
  const canRun = activeAccountId !== '' && dealId.trim().length > 0 && !isPending

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dry run a deal</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {accounts.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Add a CRM connector first; the dry-run uses it to resolve the deal.
          </p>
        ) : (
          <>
            {accounts.length > 1 && (
              <Field>
                <FieldLabel>Connector account</FieldLabel>
                <LookupSelect
                  value={activeAccountId}
                  onChange={setAccountId}
                  placeholder="Select a connector account"
                  options={accounts.map((account) => ({
                    value: account.id,
                    label: account.name,
                  }))}
                />
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="dry-run-deal-id">Pipedrive deal id</FieldLabel>
              <Input
                id="dry-run-deal-id"
                value={dealId}
                onChange={(event) => setDealId(event.target.value)}
                placeholder="e.g. 12345"
                disabled={isPending}
              />
            </Field>
            <Button
              type="button"
              size="sm"
              loading={isPending}
              disabled={!canRun}
              onClick={() =>
                dryRunDeal({
                  connectorAccountId: activeAccountId,
                  body: { externalDealId: dealId.trim() },
                })
              }
            >
              Run dry-run
            </Button>
            {error && <p className="text-sm text-red-700">{error}</p>}
            {result && (
              <div className="flex flex-col gap-2 text-sm">
                <ResourceHealthPill
                  health={result}
                  isPending={false}
                  onRefresh={() =>
                    dryRunDeal({
                      connectorAccountId: activeAccountId,
                      body: { externalDealId: dealId.trim() },
                    })
                  }
                />
                <ul className="flex flex-col gap-1">
                  {result.checks.map((check) => (
                    <li key={check.id}>
                      <span className="font-medium">{check.label}</span>
                      {' — '}
                      <span className={check.status === 'ok' ? 'text-green-700' : 'text-amber-700'}>
                        {check.status}
                      </span>
                      {check.detail ? (
                        <span className="text-muted-foreground"> — {check.detail}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
