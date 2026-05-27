import type { Config } from '@kizunu/api/api.config'
import {
  buildEvlogOptions,
  REDACTION_KEYS,
  redactionEnricher,
} from '@kizunu/api/shared/observability/evlog-options'
import type { ConfigService } from '@kizunu/config-module/config.service'
import type { EnrichContext } from 'evlog'
import { describe, expect, it, vi } from 'vite-plus/test'

vi.mock('evlog', async () => {
  const actual = await vi.importActual<typeof import('evlog')>('evlog')
  return { ...actual, initLogger: vi.fn() }
})

const SCOPED_PATHS = ['input', 'request', 'body', 'credentials'] as const
const REDACTED = '[redacted]'

function buildContext(event: Record<string, unknown>): EnrichContext {
  return { event } as unknown as EnrichContext
}

function buildConfigStub(env: Config['env'] = 'test'): ConfigService<Config> {
  return { get: vi.fn().mockReturnValue(env) } as unknown as ConfigService<Config>
}

describe('redactionEnricher', () => {
  for (const key of REDACTION_KEYS) {
    for (const path of SCOPED_PATHS) {
      it(`masks ${key} when it appears under event.${path}`, () => {
        const ctx = buildContext({ [path]: { [key]: 'secret' } })

        redactionEnricher(ctx)

        const node = (ctx.event[path] as Record<string, unknown>)[key]
        expect(node).toBe(REDACTED)
      })
    }
  }

  it('leaves top-level error.code untouched (path-scoping anti-regression)', () => {
    const ctx = buildContext({
      error: { code: 'identity.invalid-credentials', message: 'Bad creds' },
    })

    redactionEnricher(ctx)

    const error = ctx.event.error as Record<string, unknown>
    expect(error.code).toBe('identity.invalid-credentials')
    expect(error.message).toBe('Bad creds')
  })

  it('masks credentials nested arbitrarily deep under a scoped path', () => {
    const ctx = buildContext({
      input: { provider: { config: { meta: { accessToken: 'abc' } } } },
    })

    redactionEnricher(ctx)

    const provider = (ctx.event.input as Record<string, unknown>).provider as Record<
      string,
      unknown
    >
    const config = provider.config as Record<string, unknown>
    const meta = config.meta as Record<string, unknown>
    expect(meta.accessToken).toBe(REDACTED)
  })

  it('walks arrays of objects inside a scoped path, masking matching keys per item', () => {
    const ctx = buildContext({
      input: {
        attempts: [
          { accessToken: 'a', userId: 'u-1' },
          { other: 'kept', verifyToken: 'b' },
        ],
      },
    })

    redactionEnricher(ctx)

    expect(ctx.event.input).toEqual({
      attempts: [
        { accessToken: REDACTED, userId: 'u-1' },
        { other: 'kept', verifyToken: REDACTED },
      ],
    })
  })

  it('leaves non-credential keys untouched under a scoped path', () => {
    const ctx = buildContext({
      input: {
        workspaceId: 'ws-1',
        pluginId: 'meta-whatsapp-coex',
        step: 'oauth-exchange',
      },
    })

    redactionEnricher(ctx)

    expect(ctx.event.input).toEqual({
      workspaceId: 'ws-1',
      pluginId: 'meta-whatsapp-coex',
      step: 'oauth-exchange',
    })
  })

  it('is a no-op when ctx.event is not a plain object', () => {
    const ctx = { event: null } as unknown as EnrichContext

    expect(() => redactionEnricher(ctx)).not.toThrow()
  })

  it('redacts the credentials top-level key under a scoped path (vocabulary entry)', () => {
    const ctx = buildContext({
      body: { credentials: { accessToken: 'a', wabaId: 'w' } },
    })

    redactionEnricher(ctx)

    expect(ctx.event.body).toEqual({ credentials: REDACTED })
  })
})

describe('buildEvlogOptions', () => {
  it('returns options excluding /health and wiring redactionEnricher as enrich', () => {
    const options = buildEvlogOptions(buildConfigStub('test'))

    expect(options.exclude).toEqual(['/health'])
    expect(options.enrich).toBe(redactionEnricher)
  })
})
