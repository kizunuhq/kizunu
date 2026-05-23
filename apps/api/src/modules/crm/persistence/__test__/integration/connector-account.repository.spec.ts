import { buildCredentialsCipher } from '@kizunu/api/__test__/integration/credentials-cipher'
import { closeDb, db, truncateAll } from '@kizunu/api/__test__/integration/db'
import { connectorAccounts } from '@kizunu/api/db/schemas/connector-accounts'
import { workspaces } from '@kizunu/api/db/schemas/workspaces'
import { ConnectorAccountRepository } from '@kizunu/api/modules/crm/persistence/connector-account.repository'
import type { DrizzleService } from '@kizunu/nestjs-shared/modules/persistence/services/drizzle.service'
import { eq } from 'drizzle-orm'
import { afterAll, beforeEach, describe, expect, it } from 'vite-plus/test'

const cipher = buildCredentialsCipher()
const repository = new ConnectorAccountRepository({ db } as unknown as DrizzleService, cipher)

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

  it('writes credentials encrypted on disk and decrypts on read', async () => {
    const workspaceId = await seedWorkspace()
    const plaintext = { apiToken: 'live-token', companyDomain: 'acme' }

    const { id } = await repository.create({
      workspaceId,
      connectorId: 'pipedrive',
      name: 'Acme Pipedrive',
      credentials: plaintext,
    })

    const [raw] = await db
      .select({ credentials: connectorAccounts.credentials })
      .from(connectorAccounts)
      .where(eq(connectorAccounts.id, id))
    expect(cipher.isEnvelope(raw?.credentials)).toBe(true)

    const found = await repository.findById(id)
    expect(found?.credentials).toEqual(plaintext)
  })

  it('reads pre-030 plaintext rows unchanged (backward compatibility)', async () => {
    const workspaceId = await seedWorkspace()
    const legacyPlaintext = { apiToken: 'legacy-token', companyDomain: 'legacy' }
    const [row] = await db
      .insert(connectorAccounts)
      .values({
        workspaceId,
        connectorId: 'pipedrive',
        name: 'Legacy Pipedrive',
        credentials: legacyPlaintext,
      })
      .returning({ id: connectorAccounts.id })

    const found = await repository.findById(row!.id)

    expect(found?.credentials).toEqual(legacyPlaintext)
  })
})
