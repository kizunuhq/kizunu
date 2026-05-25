import { useConnectorHealth } from '@kizunu/api-client/crm/use-connector-health'
import { useWorkspaceConnectors } from '@kizunu/api-client/crm/use-workspace-connectors'
import { DataTable } from '@kizunu/web/components/composed/data-table'
import { ResourceHealthPill } from '@kizunu/web/components/composed/resource-health-pill'

interface ConnectorAccountsTableProps {
  workspaceId: string
}

interface ConnectorRow {
  id: string
  connectorId: string
  name: string
  createdAt: string
}

export function ConnectorAccountsTable({ workspaceId }: ConnectorAccountsTableProps) {
  const { data, isPending } = useWorkspaceConnectors(workspaceId)
  const rows = data?.accounts ?? []

  return (
    <DataTable
      columns={[
        { key: 'name', header: 'Name', cell: (row: ConnectorRow) => row.name },
        {
          key: 'connector',
          header: 'Provider',
          cell: (row: ConnectorRow) => row.connectorId,
        },
        {
          key: 'health',
          header: 'Status',
          cell: (row: ConnectorRow) => (
            <ConnectorHealthCell workspaceId={workspaceId} accountId={row.id} />
          ),
        },
      ]}
      rows={rows}
      isPending={isPending}
      rowKey={(row) => row.id}
      emptyTitle="No connectors yet"
      emptyDescription="Add a CRM connector to start mapping stages to cadences."
    />
  )
}

function ConnectorHealthCell({
  workspaceId,
  accountId,
}: {
  workspaceId: string
  accountId: string
}) {
  const { data, isPending, refetch } = useConnectorHealth(workspaceId, accountId)
  return <ResourceHealthPill health={data} isPending={isPending} onRefresh={() => void refetch()} />
}
