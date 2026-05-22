import { buildOpenApiDocument } from '@kizunu/api/shared/http/openapi'
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, it } from 'vite-plus/test'

import { ApiModule } from '../../api.module'

// e2e: builds the OpenAPI document from the booted app and asserts it describes the API.
describe('OpenAPI document (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [ApiModule] }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it('is an OpenAPI 3 document covering the key routes', () => {
    const doc = buildOpenApiDocument(app)

    expect(doc.openapi).toMatch(/^3\./)
    expect(Object.keys(doc.paths)).toEqual(
      expect.arrayContaining([
        '/auth/login',
        '/workspaces/{id}/cadences',
        '/workspaces/{id}/lead-journeys',
        '/webhooks/crm/{connectorAccountId}',
      ]),
    )
  })

  it('exposes component schemas from the zod DTOs', () => {
    const doc = buildOpenApiDocument(app)

    expect(Object.keys(doc.components?.schemas ?? {}).length).toBeGreaterThan(0)
  })
})
