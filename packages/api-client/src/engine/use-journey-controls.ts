import { Routes } from '@kizunu/api-contracts/routes'
import { type UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import { post } from '../client/api-client'
import type { ApiError } from '../client/api-error'
import { QueryKeys } from '../query-keys'

interface ControlInput {
  journeyId: string
}

function buildHook(action: 'pause' | 'resume' | 'stop') {
  return function useJourneyControl(
    workspaceId: string,
    options?: UseMutationOptions<unknown, ApiError, ControlInput>,
  ) {
    const queryClient = useQueryClient()
    const { mutate, ...rest } = useMutation({
      mutationFn: (input: ControlInput) =>
        post<unknown>(Routes.leadJourneys[action](workspaceId, input.journeyId)),
      ...options,
      onSuccess: async (...args) => {
        await queryClient.invalidateQueries({
          queryKey: [QueryKeys.workspaceLeadJourneys, workspaceId],
        })
        await options?.onSuccess?.(...args)
      },
    })
    return { ...rest, controlJourney: mutate }
  }
}

export const usePauseJourney = buildHook('pause')
export const useResumeJourney = buildHook('resume')
export const useStopJourney = buildHook('stop')

export function usePauseAllJourneys(
  workspaceId: string,
  options?: UseMutationOptions<void, ApiError>,
) {
  const queryClient = useQueryClient()
  const { mutate, ...rest } = useMutation({
    mutationFn: () => post<void>(Routes.leadJourneys.pauseAll(workspaceId)),
    ...options,
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({
        queryKey: [QueryKeys.workspaceLeadJourneys, workspaceId],
      })
      await options?.onSuccess?.(...args)
    },
  })
  return { ...rest, pauseAllJourneys: mutate }
}
