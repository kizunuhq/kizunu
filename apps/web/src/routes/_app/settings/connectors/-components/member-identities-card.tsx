import { useWorkspaceConnectors } from '@kizunu/api-client/crm/use-workspace-connectors'
import { LookupSelect } from '@kizunu/web/components/composed/lookup-select'
import { Button } from '@kizunu/web/components/primitives/button'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@kizunu/web/components/primitives/card'
import { Field, FieldLabel } from '@kizunu/web/components/primitives/field'
import { MemberIdentitiesTable } from '@kizunu/web/routes/_app/settings/connectors/-components/member-identities-table'
import { CreateMemberIdentityDialog } from '@kizunu/web/routes/_app/settings/connectors/-dialogs/create-member-identity-dialog'
import { Plus } from '@phosphor-icons/react'
import { useState } from 'react'

interface MemberIdentitiesCardProps {
  workspaceId: string
}

export function MemberIdentitiesCard({ workspaceId }: MemberIdentitiesCardProps) {
  const { data: connectorsResponse, isPending } = useWorkspaceConnectors(workspaceId)
  const accounts = connectorsResponse?.accounts ?? []
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [createOpen, setCreateOpen] = useState(false)

  const activeAccountId = selectedAccountId || accounts[0]?.id || ''
  const hasAccount = activeAccountId !== ''

  return (
    <Card>
      <CardHeader>
        <CardTitle>Member identities (CRM owner mapping)</CardTitle>
        <CardAction>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCreateOpen(true)}
            disabled={!hasAccount}
          >
            <Plus weight="bold" />
            Add identity
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {accounts.length > 1 && (
          <Field>
            <FieldLabel>Connector account</FieldLabel>
            <LookupSelect
              value={activeAccountId}
              onChange={setSelectedAccountId}
              placeholder="Select a connector account"
              options={accounts.map((account) => ({ value: account.id, label: account.name }))}
            />
          </Field>
        )}
        {isPending ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : !hasAccount ? (
          <p className="text-muted-foreground text-sm">
            Add a CRM connector first; member identities live under a specific account.
          </p>
        ) : (
          <MemberIdentitiesTable workspaceId={workspaceId} connectorAccountId={activeAccountId} />
        )}
      </CardContent>
      {hasAccount && (
        <CreateMemberIdentityDialog
          workspaceId={workspaceId}
          connectorAccountId={activeAccountId}
          open={createOpen}
          onOpenChange={setCreateOpen}
        />
      )}
    </Card>
  )
}
