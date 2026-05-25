import { useNavigate } from '@tanstack/react-router'
import { z } from 'zod'

import { Route } from '../index'

export const channelsSearchSchema = z.object({
  addCoex: z.coerce.number().int().optional(),
})

export type ChannelsSearch = z.infer<typeof channelsSearchSchema>

export function useChannelsSearch() {
  const searchValues = Route.useSearch()
  const navigate = useNavigate()

  function clearAddCoex() {
    void navigate({
      to: '.',
      search: (prev) => {
        const { addCoex: _drop, ...rest } = prev as ChannelsSearch
        return rest
      },
      replace: true,
    })
  }

  return { searchValues, clearAddCoex }
}
