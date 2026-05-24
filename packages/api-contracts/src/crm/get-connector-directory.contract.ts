import { z } from 'zod'

import { DirectoryResultSchema } from '../shared/directory.contract'

export const GetConnectorDirectoryRequestSchema = z.object({
  pipelineId: z.string().min(1).optional(),
})

export type GetConnectorDirectoryRequest = z.infer<typeof GetConnectorDirectoryRequestSchema>

export const GetConnectorDirectoryResponseSchema = DirectoryResultSchema

export type GetConnectorDirectoryResponse = z.infer<typeof GetConnectorDirectoryResponseSchema>
