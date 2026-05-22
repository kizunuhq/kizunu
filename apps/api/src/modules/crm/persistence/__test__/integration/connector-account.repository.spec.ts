import { closeDb, db, truncateAll } from '@kizunu/api/__test__/integration/db'
import { workspaces } from '@kizunu/api/db/schemas/workspaces'
import { ConnectorAccountRepository } from '@kizunu/api/modules/crm/persistence/connector-account.repository'
import type { DrizzleService } from '@kizunu/nestjs-shared/modules/persistence/services/drizzle.service'
import { afterAll, beforeEach, describe, expect, it } from 'vite-plus/test'

const repository = new ConnectorAccountRepository({ db } as unknown as DrizzleService)

async function seedWorkspace() {
  const [workspace] = await db
    .insert(workspaces)
    .values({ name: 'Acme', slug: `acme-${crypto.randomUUID()}` })
    .returning({ id: workspaces.id })
  return workspace!.id
}

describe('ConnectorAccountRepository (integration)', () => {
  beforeEach(async () => {
    await truncateAll(['connector_accounts', 'workspaces'])
  })

  afterAll(async () => {
    await closeDb()
  })

  it('creates an account and lists it without exposing credentials', async () => {
    const workspaceId = await seedWorkspace()

    const { id } = await repository.create({
      workspaceId,
      connectorId: 'pipedrive',
      name: 'Acme Pipedrive',
      credentials: { apiToken: 'secret', companyDomain: 'acme' },
    })

    const accounts = await repository.listByWorkspace(workspaceId)
    expect(accounts).toEqual([
      { id, connectorId: 'pipedrive', name: 'Acme Pipedrive', createdAt: expect.any(Date) },
    ])
    expect(accounts[0]).not.toHaveProperty('credentials')
  })

  it('resolves an account and its credentials by connector for a workspace', async () => {
    const workspaceId = await seedWorkspace()
    const { id } = await repository.create({
      workspaceId,
      connectorId: 'pipedrive',
      name: 'Acme Pipedrive',
      credentials: { apiToken: 'secret', companyDomain: 'acme' },
    })

    const found = await repository.findByConnectorInWorkspace('pipedrive', workspaceId)

    expect(found).toEqual({ id, credentials: { apiToken: 'secret', companyDomain: 'acme' } })
  })

  it('does not resolve an account from another workspace', async () => {
    const workspaceId = await seedWorkspace()
    const otherWorkspaceId = await seedWorkspace()
    await repository.create({
      workspaceId,
      connectorId: 'pipedrive',
      name: 'Acme Pipedrive',
      credentials: { apiToken: 'secret', companyDomain: 'acme' },
    })

    expect(
      await repository.findByConnectorInWorkspace('pipedrive', otherWorkspaceId),
    ).toBeUndefined()
  })
})
