import { buildOpenApiDocument } from '@kizunu/api/shared/http/openapi'
import type { INestApplication } from '@nestjs/common'
import { afterAll, beforeAll, describe, expect, it } from 'vite-plus/test'

import { createTestApp } from './create-test-app'

// e2e: builds the OpenAPI document from the booted app and asserts it describes the API.
describe('OpenAPI document (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    app = await createTestApp()
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
