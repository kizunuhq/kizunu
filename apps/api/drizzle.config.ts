import { defineConfig } from 'drizzle-kit'

const databaseUrl = process.env.APP_DATABASE_URL ?? process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('APP_DATABASE_URL or DATABASE_URL must be set to run drizzle-kit')
}

export default defineConfig({
  schema: './src/db/schemas/*',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
  casing: 'snake_case',
  migrations: {
    table: '__kizunu_migrations__',
  },
})
