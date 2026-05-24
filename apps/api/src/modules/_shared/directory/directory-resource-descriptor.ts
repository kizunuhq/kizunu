import type { ZodType } from 'zod'

export interface DirectoryResourceDescriptor {
  name: string
  ttlMs?: number
  paramsSchema?: ZodType
}
