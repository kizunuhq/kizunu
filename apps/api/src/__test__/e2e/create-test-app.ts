import { ApiModule } from '@kizunu/api/api.module'
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import cookieParser from 'cookie-parser'
import { ZodValidationPipe } from 'nestjs-zod'

// Boots `ApiModule` in-process with the same runtime middleware `main.ts`
// applies during bootstrap. `createNestApplication()` alone wires only the
// DI-registered providers (guards, filters), so without this the session
// cookie is never parsed and authenticated requests fail with 401.
export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [ApiModule] }).compile()
  const app = moduleRef.createNestApplication()
  app.use(cookieParser())
  app.useGlobalPipes(new ZodValidationPipe())
  await app.init()
  return app
}
