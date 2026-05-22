import { z } from 'zod'

const configSchema = z.object({
  env: z.enum(['development', 'production', 'test']).default('development'),
  port: z.coerce.number().int().positive().default(3001),
  appUrl: z.string().default('http://localhost:3001'),
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
  meta: z.object({
    verifyToken: z.string().default(''),
  }),
})

export type Config = z.infer<typeof configSchema>

const toArray = (value?: string): string[] => (value ? value.split(',').map((v) => v.trim()) : [])

export function load(): Config {
  const parsed = configSchema.safeParse({
    env: process.env.NODE_ENV,
    port: process.env.PORT,
    appUrl: process.env.APP_URL,
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
    meta: {
      verifyToken: process.env.APP_META_VERIFY_TOKEN,
    },
  })

  if (parsed.success) {
    return parsed.data
  }

  throw new Error(`Invalid configuration: ${parsed.error.message}`)
}
