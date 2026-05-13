import { z } from 'zod'

export const RegisterRequestSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(255),
  name: z.string().min(1).max(255),
})

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>

export const RegisterResponseSchema = z.object({
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string(),
  }),
  workspace: z.object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
  }),
})

export type RegisterResponse = z.infer<typeof RegisterResponseSchema>
