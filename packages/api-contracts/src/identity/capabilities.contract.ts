import { z } from 'zod'

/**
 * Public, unauthenticated snapshot of instance auth capabilities. Drives
 * client behavior (e.g. whether the signup page renders a form) without baking
 * a build-time switch into the web app. Only booleans are exposed, never any
 * user or instance data.
 */
export const AuthCapabilitiesResponseSchema = z.object({
  registrationEnabled: z.boolean(),
  oauthProviders: z.array(z.object({ id: z.string(), label: z.string() })),
})

export type AuthCapabilitiesResponse = z.infer<typeof AuthCapabilitiesResponseSchema>
