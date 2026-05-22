import { z } from 'zod'

export const LoginRequestSchema = z.object({
  email: z.email().max(255),
  password: z.string().min(1).max(255),
})

export type LoginRequest = z.infer<typeof LoginRequestSchema>

export const LoginResponseSchema = z.object({
  user: z.object({
    id: z.uuid(),
    email: z.email(),
    name: z.string(),
  }),
  activeWorkspaceId: z.uuid().nullable(),
})

export type LoginResponse = z.infer<typeof LoginResponseSchema>
