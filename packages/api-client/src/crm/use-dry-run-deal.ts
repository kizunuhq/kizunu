import type { ConnectorHealth, DryRunDealRequest } from '@kizunu/api-contracts/crm'
import { type UseMutationOptions, useMutation } from '@tanstack/react-query'

import type { ApiError } from '../client/api-error'
import { dryRunDeal } from './crm.api'

interface DryRunInput {
  connectorAccountId: string
  body: DryRunDealRequest
}

export function useDryRunDeal(
  workspaceId: string,
  options?: UseMutationOptions<ConnectorHealth, ApiError, DryRunInput>,
) {
  const { mutate, ...rest } = useMutation({
    mutationFn: (input: DryRunInput) =>
      dryRunDeal(workspaceId, input.connectorAccountId, input.body),
    ...options,
  })
  return { ...rest, dryRunDeal: mutate }
}
