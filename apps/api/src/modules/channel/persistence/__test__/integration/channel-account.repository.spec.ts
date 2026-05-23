import { buildCredentialsCipher } from '@kizunu/api/__test__/integration/credentials-cipher'
import { closeDb, db, truncateAll } from '@kizunu/api/__test__/integration/db'
import { channelAccounts } from '@kizunu/api/db/schemas/channel-accounts'
import { workspaces } from '@kizunu/api/db/schemas/workspaces'
import { ChannelAccountRepository } from '@kizunu/api/modules/channel/persistence/channel-account.repository'
import { CredentialsDecryptionFailedException } from '@kizunu/nestjs-shared/lib/exceptions/credentials-decryption-failed.exception'
import type { DrizzleService } from '@kizunu/nestjs-shared/modules/persistence/services/drizzle.service'
import { eq } from 'drizzle-orm'
import { afterAll, beforeEach, describe, expect, it } from 'vite-plus/test'

const cipher = buildCredentialsCipher()
const repository = new ChannelAccountRepository({ db } as unknown as DrizzleService, cipher)

async function seedWorkspace(): Promise<string> {
  const [workspace] = await db
    .insert(workspaces)
    .values({ name: 'Acme', slug: `acme-${crypto.randomUUID()}` })
    .returning({ id: workspaces.id })
  return workspace!.id
}

const sampleCredentials = {
  appId: 'app-1',
  appSecret: 'app-secret-1',
  wabaId: 'waba-1',
  phoneNumberId: 'phone-1',
  systemToken: 'system-token-1',
  verifyToken: 'verify-token-1',
}

describe('ChannelAccountRepository (integration)', () => {
  beforeEach(async () => {
    await truncateAll(['channel_accounts', 'workspaces'])
  })

  afterAll(async () => {
    await closeDb()
  })

  it('encrypts credentials on disk and decrypts on findCredentials (feature 030)', async () => {
    const workspaceId = await seedWorkspace()

    const { id } = await repository.create({
      workspaceId,
      pluginId: 'meta-whatsapp',
      name: 'WA primary',
      credentials: sampleCredentials,
    })

    const [raw] = await db
      .select({ credentials: channelAccounts.credentials })
      .from(channelAccounts)
      .where(eq(channelAccounts.id, id))
    expect(cipher.isEnvelope(raw?.credentials)).toBe(true)

    const found = await repository.findCredentials(id)
    expect(found?.credentials).toEqual(sampleCredentials)
  })

  it('decrypts credentials on findWorkspaceAndCredentials too', async () => {
    const workspaceId = await seedWorkspace()
    const { id } = await repository.create({
      workspaceId,
      pluginId: 'meta-whatsapp',
      name: 'WA primary',
      credentials: sampleCredentials,
    })

    const found = await repository.findWorkspaceAndCredentials(id)

    expect(found).toEqual({ workspaceId, credentials: sampleCredentials })
  })

  it('reads pre-030 plaintext credentials unchanged (backward compatibility)', async () => {
    const workspaceId = await seedWorkspace()
    const legacy = { appId: 'app-legacy', verifyToken: 'legacy' }
    const [row] = await db
      .insert(channelAccounts)
      .values({
        workspaceId,
        pluginId: 'meta-whatsapp',
        name: 'Legacy WA',
        credentials: legacy,
      })
      .returning({ id: channelAccounts.id })

    const found = await repository.findCredentials(row!.id)

    expect(found?.credentials).toEqual(legacy)
  })

  it('persistCredentials re-encrypts on update', async () => {
    const workspaceId = await seedWorkspace()
    const { id } = await repository.create({
      workspaceId,
      pluginId: 'meta-whatsapp',
      name: 'WA primary',
      credentials: sampleCredentials,
    })

    const refreshed = { ...sampleCredentials, systemToken: 'refreshed-token' }
    await repository.persistCredentials(id, refreshed)

    const [raw] = await db
      .select({ credentials: channelAccounts.credentials })
      .from(channelAccounts)
      .where(eq(channelAccounts.id, id))
    expect(cipher.isEnvelope(raw?.credentials)).toBe(true)
    expect((await repository.findCredentials(id))?.credentials).toEqual(refreshed)
  })

  it('findAllWithCredentials decrypts each row', async () => {
    const workspaceId = await seedWorkspace()
    const a = await repository.create({
      workspaceId,
      pluginId: 'meta-whatsapp',
      name: 'A',
      credentials: { ...sampleCredentials, appId: 'app-a' },
    })
    const b = await repository.create({
      workspaceId,
      pluginId: 'meta-whatsapp',
      name: 'B',
      credentials: { ...sampleCredentials, appId: 'app-b' },
    })

    const all = await repository.findAllWithCredentials()

    expect(all).toHaveLength(2)
    const byId = Object.fromEntries(all.map((row) => [row.id, row.credentials]))
    expect(byId[a.id]).toMatchObject({ appId: 'app-a' })
    expect(byId[b.id]).toMatchObject({ appId: 'app-b' })
  })

  it('throws CredentialsDecryptionFailedException when an envelope was tampered with', async () => {
    const workspaceId = await seedWorkspace()
    const { id } = await repository.create({
      workspaceId,
      pluginId: 'meta-whatsapp',
      name: 'WA primary',
      credentials: sampleCredentials,
    })

    // Tamper the IV directly in the database to force AES-GCM verification failure.
    await db
      .update(channelAccounts)
      .set({
        credentials: {
          alg: 'aes-256-gcm',
          v: 1,
          iv: 'AAAAAAAAAAAAAAAA',
          tag: 'AAAAAAAAAAAAAAAAAAAAAA==',
          data: 'AAAA',
        },
      })
      .where(eq(channelAccounts.id, id))

    await expect(repository.findCredentials(id)).rejects.toBeInstanceOf(
      CredentialsDecryptionFailedException,
    )
  })
})
