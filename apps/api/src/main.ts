import 'reflect-metadata'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ConfigService } from '@kizunu/config-module/config.service'
import { NestFactory } from '@nestjs/core'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { ZodValidationPipe } from 'nestjs-zod'
import { Pool } from 'pg'
import { type Config, load } from './api.config'
import { ApiModule } from './api.module'

async function runMigrations(): Promise<void> {
  const { database } = load()
  const pool = new Pool({ connectionString: database.url })
  const db = drizzle(pool)
  // `bun build --compile` freezes import.meta.url inside the binary, so allow
  // an explicit override via APP_MIGRATIONS_DIR for production containers.
  const migrationsFolder =
    process.env.APP_MIGRATIONS_DIR ??
    path.join(path.dirname(fileURLToPath(import.meta.url)), '../drizzle')
  await migrate(db, {
    migrationsFolder,
    migrationsTable: '__kizunu_migrations__',
  })
  await pool.end()
}

async function bootstrap(): Promise<void> {
  const application = await NestFactory.create(ApiModule, {
    bufferLogs: false,
  })
  const config = application.get<ConfigService<Config>>(ConfigService)
  const port = config.get('port')

  application.enableShutdownHooks()
  application.useGlobalPipes(new ZodValidationPipe())

  await application.listen(port)
  console.log(`Kizunu API listening on port ${port}`)
}

process.on('unhandledRejection', (reason) => {
  const error = reason instanceof Error ? reason : new Error(String(reason))
  console.error('[unhandledRejection]', error.message, '\n', error.stack)
  process.exit(1)
})

process.on('uncaughtException', (error) => {
  console.error('[uncaughtException]', error.message, '\n', error.stack)
  process.exit(1)
})

await runMigrations()
await bootstrap()
