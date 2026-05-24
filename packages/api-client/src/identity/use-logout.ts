import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { ApiError } from '../client/api-error'
import { QueryKeys } from '../query-keys'
import { logout } from './auth.api'

export function useLogout() {
  const queryClient = useQueryClient()

  const { mutate, ...rest } = useMutation<void, ApiError>({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData([QueryKeys.currentUser], null)
    },
  })
  return { ...rest, logout: mutate }
}
