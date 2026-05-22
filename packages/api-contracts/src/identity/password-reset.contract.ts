import { z } from 'zod'

export const RequestPasswordResetSchema = z.object({
  email: z.email().max(255),
})

export type RequestPasswordReset = z.infer<typeof RequestPasswordResetSchema>

export const ConfirmPasswordResetSchema = z.object({
  token: z.string().min(1).max(512),
  password: z.string().min(8).max(255),
})

export type ConfirmPasswordReset = z.infer<typeof ConfirmPasswordResetSchema>
