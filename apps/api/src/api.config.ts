import { z } from 'zod'

const configSchema = z.object({
  env: z.enum(['development', 'production', 'test']).default('development'),
  port: z.coerce.number().int().positive().default(3001),
  appUrl: z.string().default('http://localhost:3001'),
  cors: z.array(z.string()).optional(),
  database: z.object({
    url: z.string().startsWith('postgresql://'),
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
  })

  if (parsed.success) {
    return parsed.data
  }

  throw new Error(`Invalid configuration: ${parsed.error.message}`)
}
