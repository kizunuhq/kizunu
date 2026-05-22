import { ApiModule } from '@kizunu/api/api.module'
import { applyHttpMiddleware } from '@kizunu/api/shared/http/apply-http-middleware'
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'

// Boots `ApiModule` in-process with the same HTTP middleware `main.ts` applies.
// `createNestApplication()` alone wires only the DI-registered providers (guards,
// filters), so without `applyHttpMiddleware` the session cookie is never parsed
// and authenticated requests fail with 401.
export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [ApiModule] }).compile()
  const app = moduleRef.createNestApplication()
  applyHttpMiddleware(app)
  await app.init()
  return app
}
