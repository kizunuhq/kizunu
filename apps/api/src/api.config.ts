import { z } from 'zod'

const configSchema = z.object({
  env: z.enum(['development', 'production', 'test']).default('development'),
  port: z.coerce.number().int().positive().default(3001),
  appUrl: z.string().default('http://localhost:3001'),
  // Where the browser lands after an OAuth redirect flow (the web app origin).
  webUrl: z.string().default('http://localhost:3000'),
  cors: z.array(z.string()).optional(),
  database: z.object({
    url: z.string().startsWith('postgresql://'),
  }),
  session: z.object({
    cookieName: z.string().default('kizunu_session'),
    ttlDays: z.coerce.number().int().positive().default(30),
    cookieSecure: z.coerce.boolean().default(false),
  }),
  auth: z.object({
    // Self-host registration gate. stringbool (not coerce.boolean, which maps
    // "false" -> true) so DISABLE_USER_REGISTRATION=false really means open.
    registrationDisabled: z.stringbool().default(false),
  }),
  oauth: z.object({
    // A provider is enabled only when both id and secret are set (see api.module).
    github: z.object({
      clientId: z.string().default(''),
      clientSecret: z.string().default(''),
    }),
  }),
  credentials: z.object({
    // 32-byte AES-256 key, base64-encoded (44 chars with padding). Required;
    // generate with `openssl rand -base64 32`. Used by EncryptedCredentialsService
    // to encrypt provider tokens at rest (channel_accounts / connector_accounts
    // credentials JSONB columns).
    encryptionKey: z.string().min(44),
  }),
})

export type Config = z.infer<typeof configSchema>

const toArray = (value?: string): string[] => (value ? value.split(',').map((v) => v.trim()) : [])

export function load(): Config {
  const parsed = configSchema.safeParse({
    env: process.env.NODE_ENV,
    port: process.env.PORT,
    appUrl: process.env.APP_URL,
    webUrl: process.env.APP_WEB_URL,
    cors: toArray(process.env.APP_CORS_ORIGINS),
    database: {
      url: process.env.APP_DATABASE_URL,
    },
    session: {
      cookieName: process.env.APP_SESSION_COOKIE_NAME,
      ttlDays: process.env.APP_SESSION_TTL_DAYS,
      cookieSecure: process.env.APP_SESSION_COOKIE_SECURE,
    },
    auth: {
      registrationDisabled: process.env.DISABLE_USER_REGISTRATION,
    },
    oauth: {
      github: {
        clientId: process.env.OAUTH_GITHUB_CLIENT_ID,
        clientSecret: process.env.OAUTH_GITHUB_CLIENT_SECRET,
      },
    },
    credentials: {
      encryptionKey: process.env.APP_CREDENTIALS_ENCRYPTION_KEY,
    },
  })

  if (parsed.success) {
    return parsed.data
  }

  throw new Error(`Invalid configuration: ${parsed.error.message}`)
}
