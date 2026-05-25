import { closeDb, db, truncateAll } from '@kizunu/api/__test__/integration/db'
import { channelAccounts } from '@kizunu/api/db/schemas/channel-accounts'
import { workspaces } from '@kizunu/api/db/schemas/workspaces'
import { sql } from 'drizzle-orm'
import { afterAll, beforeEach, describe, expect, it } from 'vite-plus/test'

const MIGRATION_SQL = sql`
  UPDATE channel_accounts
    SET plugin_id = 'meta-whatsapp-coex'
    WHERE plugin_id = 'meta-whatsapp'
      AND credentials->>'channelMode' = 'coexistence'
`

async function seedWorkspace(): Promise<string> {
  const [row] = await db
    .insert(workspaces)
    .values({ name: 'Test', slug: `test-${crypto.randomUUID()}` })
    .returning({ id: workspaces.id })
  return row!.id
}

describe('coex pluginId migration (integration)', () => {
  let cloudApiId: string
  let coexistenceId: string
  let corruptId: string

  beforeEach(async () => {
    await truncateAll(['channel_accounts', 'workspaces'])

    const workspaceId = await seedWorkspace()

    const rows = await db
      .insert(channelAccounts)
      .values([
        {
          workspaceId,
          pluginId: 'meta-whatsapp',
          name: 'Cloud API',
          credentials: { channelMode: 'cloud_api', wabaId: 'w1' },
        },
        {
          workspaceId,
          pluginId: 'meta-whatsapp',
          name: 'Coex',
          credentials: { channelMode: 'coexistence', wabaId: 'w2' },
        },
        {
          workspaceId,
          pluginId: 'meta-whatsapp',
          name: 'Corrupt',
          credentials: { junk: true },
        },
      ])
      .returning({ id: channelAccounts.id, name: channelAccounts.name })

    const byName = Object.fromEntries(rows.map((r) => [r.name, r.id]))
    cloudApiId = byName['Cloud API']!
    coexistenceId = byName['Coex']!
    corruptId = byName['Corrupt']!
  })

  afterAll(async () => {
    await closeDb()
  })

  async function readPluginId(id: string): Promise<string> {
    const [row] = await db
      .select({ pluginId: channelAccounts.pluginId })
      .from(channelAccounts)
      .where(sql`${channelAccounts.id} = ${id}`)
    return row!.pluginId
  }

  it('flips only the coexistence row and leaves others unchanged', async () => {
    await db.execute(MIGRATION_SQL)

    expect(await readPluginId(cloudApiId)).toBe('meta-whatsapp')
    expect(await readPluginId(coexistenceId)).toBe('meta-whatsapp-coex')
    expect(await readPluginId(corruptId)).toBe('meta-whatsapp')
  })

  it('is idempotent — a second run changes nothing', async () => {
    await db.execute(MIGRATION_SQL)
    await db.execute(MIGRATION_SQL)

    expect(await readPluginId(cloudApiId)).toBe('meta-whatsapp')
    expect(await readPluginId(coexistenceId)).toBe('meta-whatsapp-coex')
    expect(await readPluginId(corruptId)).toBe('meta-whatsapp')
  })
})
