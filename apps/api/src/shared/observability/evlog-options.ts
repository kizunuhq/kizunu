import type { Config } from '@kizunu/api/api.config'
import { ConfigService } from '@kizunu/config-module/config.service'
import { initLogger, type EnrichContext } from 'evlog'
import type { EvlogNestJSOptions } from 'evlog/nestjs'

const SERVICE_NAME = 'kizunu-api'
const REDACTED_MARKER = '[redacted]'

export const REDACTION_KEYS = [
  'credentials',
  'accessToken',
  'appSecret',
  'verifyToken',
  'client_secret',
  'code',
] as const

const REDACTION_KEY_SET: ReadonlySet<string> = new Set(REDACTION_KEYS)

// Scoping containment: redaction walks only the subtrees that carry user input
// or credentials. Top-level `error.code` (the ApplicationException dot-namespaced
// code) is signal we want preserved — it does NOT live under any of these paths.
const REDACTION_SCOPED_PATHS = ['input', 'request', 'body', 'credentials'] as const

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function redactInPlace(target: unknown): void {
  if (Array.isArray(target)) {
    for (const item of target) redactInPlace(item)
    return
  }
  if (!isPlainObject(target)) return
  for (const key of Object.keys(target)) {
    if (REDACTION_KEY_SET.has(key)) {
      target[key] = REDACTED_MARKER
      continue
    }
    redactInPlace(target[key])
  }
}

export function redactionEnricher(ctx: EnrichContext): void {
  if (!isPlainObject(ctx.event)) return
  for (const path of REDACTION_SCOPED_PATHS) {
    redactInPlace(ctx.event[path])
  }
}

export function buildEvlogOptions(config: ConfigService<Config>): EvlogNestJSOptions {
  // Service auto-detection picks the workspace-root package name in a Bun
  // monorepo; pin both fields explicitly so wide events carry the expected
  // identifier in production logs.
  initLogger({
    env: {
      service: SERVICE_NAME,
      environment: config.get('env'),
      ...(process.env.npm_package_version ? { version: process.env.npm_package_version } : {}),
    },
  })
  return {
    exclude: ['/health'],
    enrich: redactionEnricher,
  }
}
