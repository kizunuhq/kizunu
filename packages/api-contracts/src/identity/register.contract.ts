import { z } from 'zod'

export const RegisterRequestSchema = z.object({
  email: z.email().max(255),
  password: z.string().min(8).max(255),
  name: z.string().min(1).max(255),
})

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>

export const RegisterResponseSchema = z.object({
  user: z.object({
    id: z.uuid(),
    email: z.email(),
    name: z.string(),
  }),
  workspace: z.object({
    id: z.uuid(),
    name: z.string(),
    slug: z.string(),
  }),
})

export type RegisterResponse = z.infer<typeof RegisterResponseSchema>
