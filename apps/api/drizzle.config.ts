import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db/schemas/*',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: (process.env.APP_DATABASE_URL ?? process.env.DATABASE_URL) as string,
  },
  casing: 'snake_case',
  migrations: {
    table: '__kizunu_migrations__',
  },
})
