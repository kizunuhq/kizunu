import { z } from 'zod'

export const DirectoryRowSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
  sublabel: z.string().optional(),
  disabled: z.boolean().optional(),
})

export type DirectoryRow = z.infer<typeof DirectoryRowSchema>

export const DirectoryResultSchema = z.object({
  items: DirectoryRowSchema.array(),
  meta: z.object({
    truncated: z.boolean(),
  }),
})

export type DirectoryResult = z.infer<typeof DirectoryResultSchema>
