import type { ListAvailableConnectorsResponse } from '@kizunu/api-contracts/crm'
import { useQuery } from '@tanstack/react-query'

import { QueryKeys } from '../query-keys'
import { listAvailableConnectors } from './crm.api'

export function useAvailableConnectors() {
  return useQuery<ListAvailableConnectorsResponse>({
    queryKey: [QueryKeys.availableConnectors],
    queryFn: () => listAvailableConnectors(),
  })
}
