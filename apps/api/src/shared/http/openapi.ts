import type { INestApplication } from '@nestjs/common'
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from '@nestjs/swagger'
import { cleanupOpenApiDoc } from 'nestjs-zod'

/**
 * Builds the OpenAPI 3 document from the app's controllers and zod DTOs. `nestjs-zod`'s
 * `cleanupOpenApiDoc` strips internal zod artifacts so the schemas are clean. Pure over
 * the app (no network), so it can be built in tests as well as served at `/docs`.
 */
export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Kizunu API')
    .setDescription('Sales engagement engine — v0.1')
    .setVersion('0.1')
    .addCookieAuth('kizunu_session')
    .build()
  return cleanupOpenApiDoc(SwaggerModule.createDocument(app, config))
}
