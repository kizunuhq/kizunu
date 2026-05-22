import type { INestApplication } from '@nestjs/common'
import cookieParser from 'cookie-parser'
import { ZodValidationPipe } from 'nestjs-zod'

// The request-handling middleware every HTTP entry point needs: cookie parsing
// (the session guard reads `req.cookies`) and zod input validation. Shared by
// the production bootstrap (`main.ts`) and the e2e test app so they cannot drift.
export function applyHttpMiddleware(app: INestApplication): void {
  app.use(cookieParser())
  app.useGlobalPipes(new ZodValidationPipe())
}
