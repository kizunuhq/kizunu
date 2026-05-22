import { z } from 'zod'

/**
 * Pipedrive connector credentials/config. `apiToken` authenticates API calls (passed
 * as `?api_token=`); `companyDomain` builds the per-tenant API base. `activityType`
 * is the Pipedrive activity type for logged touches; `phoneFieldKey` maps which deal
 * field holds the phone when it is not the default. `.strict()` rejects unknown keys.
 */
export const pipedriveCredentialsSchema = z
  .object({
    apiToken: z.string().min(1),
    companyDomain: z.string().min(1),
    activityType: z.string().min(1).default('task'),
    phoneFieldKey: z.string().min(1).optional(),
  })
  .strict()

export type PipedriveCredentials = z.infer<typeof pipedriveCredentialsSchema>
