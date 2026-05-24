import { z } from 'zod'

import { DirectoryResultSchema } from '../shared/directory.contract'

export const GetChannelDirectoryRequestSchema = z.object({
  language: z.string().min(2).max(10).optional(),
})

export type GetChannelDirectoryRequest = z.infer<typeof GetChannelDirectoryRequestSchema>

export const GetChannelDirectoryResponseSchema = DirectoryResultSchema

export type GetChannelDirectoryResponse = z.infer<typeof GetChannelDirectoryResponseSchema>
