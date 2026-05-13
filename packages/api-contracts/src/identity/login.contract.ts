import { z } from 'zod'

export const LoginRequestSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(255),
})

export type LoginRequest = z.infer<typeof LoginRequestSchema>

export const LoginResponseSchema = z.object({
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string(),
  }),
  activeWorkspaceId: z.string().uuid().nullable(),
})

export type LoginResponse = z.infer<typeof LoginResponseSchema>
