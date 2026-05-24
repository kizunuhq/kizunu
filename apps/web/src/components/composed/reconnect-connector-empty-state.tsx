import { Button } from '@kizunu/web/components/primitives/button'

import { EmptyState } from './empty-state'

interface ReconnectConnectorEmptyStateProps {
  scope: 'crm' | 'channel'
  onReconnect: () => void
  description?: string
}

const TITLE_BY_SCOPE: Record<ReconnectConnectorEmptyStateProps['scope'], string> = {
  crm: 'This CRM connection needs to be reconnected',
  channel: 'This channel needs to be reconnected',
}

const DEFAULT_DESCRIPTION_BY_SCOPE: Record<ReconnectConnectorEmptyStateProps['scope'], string> = {
  crm: 'The credentials expired. Reconnect the connector to keep loading data.',
  channel: 'The provider token expired. Reconnect the channel to keep loading data.',
}

export function ReconnectConnectorEmptyState({
  scope,
  onReconnect,
  description,
}: ReconnectConnectorEmptyStateProps) {
  return (
    <EmptyState
      title={TITLE_BY_SCOPE[scope]}
      description={description ?? DEFAULT_DESCRIPTION_BY_SCOPE[scope]}
      action={<Button onClick={onReconnect}>Reconnect</Button>}
    />
  )
}
