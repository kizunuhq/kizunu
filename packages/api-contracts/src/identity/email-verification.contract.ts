import { z } from 'zod'

export const ConfirmEmailVerificationSchema = z.object({
  token: z.string().min(1).max(512),
})

export type ConfirmEmailVerification = z.infer<typeof ConfirmEmailVerificationSchema>
