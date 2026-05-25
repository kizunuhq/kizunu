import { z } from 'zod'

import { credentialFieldRegistry } from './credentials/describe-credential-fields'

/**
 * Reusable zod shape for any plugin/connector whose provider issues OAuth-style
 * credentials. Spread into the plugin's own credentials object via `.extend()`
 * or `z.object({ ...base, ...oauthCredentialFields }).strict()`. Keeps the
 * triplet `(accessToken, refreshToken?, accessTokenExpiresAt?)` identical across
 * the codebase so `OAuthRefreshService` and the future encryption / refresh
 * primitives can read every OAuth-using row uniformly.
 *
 * `accessTokenExpiresAt` is `z.iso.datetime()` on the wire — providers return an
 * ISO timestamp in the OAuth response. Consumers that need a `Date` object
 * apply `.pipe(z.coerce.date())` or convert at the call site; keeping the
 * stored shape stringly avoids losing precision through JSON round-trips on the
 * `jsonb` column.
 */
export const oauthCredentialFields = {
  accessToken: z
    .string()
    .min(1)
    .register(credentialFieldRegistry, { label: 'Access token', type: 'secret' }),
  refreshToken: z
    .string()
    .min(1)
    .register(credentialFieldRegistry, { label: 'Refresh token', type: 'secret' })
    .optional(),
  accessTokenExpiresAt: z.iso
    .datetime()
    .register(credentialFieldRegistry, {
      label: 'Access token expires at',
      type: 'text',
    })
    .optional(),
} satisfies z.ZodRawShape

export type OAuthCredentialFields = z.infer<z.ZodObject<typeof oauthCredentialFields>>
