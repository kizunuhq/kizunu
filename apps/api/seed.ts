/**
 * Dev seed — a full v0.1 pilot in one workspace, for local testing.
 *
 * Mirrors the v0.1 contract end to end: a Pipedrive stage entry trigger starts a
 * WhatsApp (Meta Cloud) cadence, and lead journeys show every interesting state —
 * running, reply-stopped, manually stopped, and exhausted (which fires mark-lost).
 *
 * Creates (all under workspace "Acme Sales"):
 *   - 2 users with workspace memberships (1 admin, 1 member)
 *   - 1 Pipedrive connector account + 1 Meta WhatsApp channel account
 *   - channel access (each user's primary outbound account)
 *   - 1 HSM template + 1 three-step cadence with reply-stop and mark-lost hooks
 *   - 1 entry trigger (Pipedrive "qualified" stage -> the cadence)
 *   - 4 leads, each with a journey in a different status + their touch attempts
 *
 * Credentials (password for both): Kizunu123!
 *   owner@kizunu.dev   workspace admin  (owns most leads)
 *   rep@kizunu.dev     workspace member
 *
 * Usage:
 *   bun run db:seed            (from apps/api, or `bun --filter @kizunu/api db:seed`)
 *
 * Idempotent: users upsert by email; the workspace is dropped by slug and rebuilt,
 * so every workspace-scoped row is recreated cleanly on each run.
 */

import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import {
  cadenceSteps,
  cadences,
  channelAccesses,
  channelAccounts,
  connectorAccounts,
  entryTriggers,
  leadJourneys,
  leads,
  memberships,
  templates,
  touchAttempts,
  users,
  workspaces,
} from './src/db/schemas'

const PASSWORD = 'Kizunu123!'
const WORKSPACE_SLUG = 'acme-sales'
const CHANNEL_PLUGIN_ID = 'meta-whatsapp'
const CONNECTOR_ID = 'pipedrive'

const MINUTES_PER_DAY = 1440
const SENT = 'sent'

const DATABASE_URL =
  process.env.APP_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/kizunu_dev'

const pool = new Pool({ connectionString: DATABASE_URL })
const db = drizzle(pool, { casing: 'snake_case' })

// Helpers

function hashPassword(plain: string): Promise<string> {
  return Bun.password.hash(plain)
}

function log(label: string, detail: string): void {
  console.log(`  ${label.padEnd(20)} ${detail}`)
}

function first<T>(rows: T[]): T {
  const row = rows[0]
  if (!row) {
    throw new Error('Expected at least one row from insert')
  }
  return row
}

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * MINUTES_PER_DAY * 60 * 1000)
}

// Users (persist across runs; everything else is rebuilt under the workspace)

console.log('\nUsers')

const passwordHash = await hashPassword(PASSWORD)
const verifiedAt = new Date()

async function upsertUser(email: string, name: string) {
  const row = first(
    await db
      .insert(users)
      .values({ email, name, passwordHash, emailVerifiedAt: verifiedAt })
      .onConflictDoUpdate({
        target: users.email,
        set: { name, passwordHash, emailVerifiedAt: verifiedAt },
      })
      .returning(),
  )
  log(email, name)
  return row
}

const owner = await upsertUser('owner@kizunu.dev', 'Olivia Owner')
const rep = await upsertUser('rep@kizunu.dev', 'Rafael Rep')

// Workspace (drop-and-rebuild by slug cascades to all workspace-scoped rows)

console.log('\nWorkspace')

await db.delete(workspaces).where(eq(workspaces.slug, WORKSPACE_SLUG))

const workspace = first(
  await db.insert(workspaces).values({ name: 'Acme Sales', slug: WORKSPACE_SLUG }).returning(),
)

log('workspace', `${workspace.name} (${workspace.id})`)

await db.insert(memberships).values([
  { workspaceId: workspace.id, userId: owner.id, role: 'admin' },
  { workspaceId: workspace.id, userId: rep.id, role: 'member' },
])

log('memberships', 'owner=admin, rep=member')

// Connector + channel accounts

console.log('\nAccounts')

const connectorAccount = first(
  await db
    .insert(connectorAccounts)
    .values({
      workspaceId: workspace.id,
      connectorId: CONNECTOR_ID,
      name: 'Acme Pipedrive',
      credentials: { apiToken: 'dev-pipedrive-token', companyDomain: 'acme', activityType: 'task' },
    })
    .returning(),
)

log('connector', `${CONNECTOR_ID} (${connectorAccount.name})`)

const channelAccount = first(
  await db
    .insert(channelAccounts)
    .values({
      workspaceId: workspace.id,
      pluginId: CHANNEL_PLUGIN_ID,
      name: 'Acme WhatsApp',
      credentials: {
        channelMode: 'cloud_api',
        appId: 'dev-app-id',
        appSecret: 'dev-app-secret',
        wabaId: 'dev-waba',
        phoneNumberId: 'dev-phone',
        systemToken: 'dev-system-token',
        verifyToken: 'dev-verify-token',
      },
    })
    .returning(),
)

log('channel', `${CHANNEL_PLUGIN_ID} (${channelAccount.name})`)

await db.insert(channelAccesses).values([
  { channelAccountId: channelAccount.id, userId: owner.id, isPrimary: true },
  { channelAccountId: channelAccount.id, userId: rep.id, isPrimary: true },
])

log('channel access', 'owner + rep primary')

// Template + cadence

console.log('\nCadence')

const template = first(
  await db
    .insert(templates)
    .values({
      workspaceId: workspace.id,
      name: 'intro-pt-br',
      channelPluginId: CHANNEL_PLUGIN_ID,
      providerTemplateName: 'intro_pt_br',
      language: 'pt_BR',
      variables: ['name'],
    })
    .returning(),
)

log('template', `${template.name} -> ${template.providerTemplateName}`)

const cadence = first(
  await db
    .insert(cadences)
    .values({
      workspaceId: workspace.id,
      name: 'WhatsApp Outreach',
      status: 'active',
      stopOnReply: true,
      onReply: [
        {
          type: 'log_activity',
          activityType: 'whatsapp_reply',
          subject: 'Lead replied on WhatsApp',
          note: 'Reply-stop triggered; cadence halted.',
        },
      ],
      onExhausted: [{ type: 'mark_lost', reason: 'No response after WhatsApp cadence' }],
      onComplete: [],
    })
    .returning(),
)

log('cadence', `${cadence.name} (stopOnReply, mark-lost on exhausted)`)

await db.insert(cadenceSteps).values(
  [0, 1, 2].map((stepOrder) => ({
    cadenceId: cadence.id,
    stepOrder,
    delayMinutes: stepOrder * MINUTES_PER_DAY,
    jitterMinutes: stepOrder * 60,
    channelPluginId: CHANNEL_PLUGIN_ID,
    templateId: template.id,
  })),
)

log('cadence steps', '3 steps, opener + 2 follow-ups')

await db.insert(entryTriggers).values({
  workspaceId: workspace.id,
  connectorAccountId: connectorAccount.id,
  pipelineId: null,
  stageId: 'qualified',
  cadenceId: cadence.id,
})

log('entry trigger', 'Pipedrive stage "qualified" -> WhatsApp Outreach')

// Leads + journeys + touch attempts (one journey per interesting status)

console.log('\nLeads and journeys')

const leadPlan = [
  {
    name: 'Maria Silva',
    phone: '+5511999990001',
    externalId: 'pd-deal-101',
    owner,
    status: 'running' as const,
    lastStep: 0,
    nextTouchAt: daysFromNow(1),
  },
  {
    name: 'João Santos',
    phone: '+5511999990002',
    externalId: 'pd-deal-102',
    owner,
    status: 'replied' as const,
    lastStep: 0,
    nextTouchAt: null,
  },
  {
    name: 'Ana Pereira',
    phone: '+5511999990003',
    externalId: 'pd-deal-103',
    owner: rep,
    status: 'stopped' as const,
    lastStep: 1,
    nextTouchAt: null,
  },
  {
    name: 'Carlos Souza',
    phone: '+5511999990004',
    externalId: 'pd-deal-104',
    owner,
    status: 'exhausted' as const,
    lastStep: 2,
    nextTouchAt: null,
  },
]

for (const plan of leadPlan) {
  const lead = first(
    await db
      .insert(leads)
      .values({
        workspaceId: workspace.id,
        connectorAccountId: connectorAccount.id,
        externalId: plan.externalId,
        ownerExternalId: 'pd-user-1',
        ownerUserId: plan.owner.id,
        name: plan.name,
        phone: plan.phone,
      })
      .returning(),
  )

  const journey = first(
    await db
      .insert(leadJourneys)
      .values({
        leadId: lead.id,
        cadenceId: cadence.id,
        status: plan.status,
        currentStepOrder: plan.lastStep,
        nextTouchAt: plan.nextTouchAt,
      })
      .returning(),
  )

  const attempts = Array.from({ length: plan.lastStep + 1 }, (_, stepOrder) => ({
    leadJourneyId: journey.id,
    stepOrder,
    status: SENT,
    externalMessageId: `wamid.dev-${plan.externalId}-${stepOrder}`,
  }))
  await db.insert(touchAttempts).values(attempts)

  log(plan.name, `${plan.status} (${attempts.length} touch${attempts.length === 1 ? '' : 'es'})`)
}

// Summary

console.log(`
Seed complete.

Credentials (password for both: ${PASSWORD})
  owner@kizunu.dev   workspace admin
  rep@kizunu.dev     workspace member

IDs (for direct API testing):
  workspace_id: ${workspace.id}
  cadence_id:   ${cadence.id}
  connector_id: ${connectorAccount.id}
  channel_id:   ${channelAccount.id}

Pilot path:
  1. Log in as owner@kizunu.dev -> workspace "Acme Sales".
  2. A deal entering the Pipedrive "qualified" stage starts "WhatsApp Outreach".
  3. Journeys show running / replied (reply-stop) / stopped / exhausted (mark-lost).
`)

await pool.end()
process.exit(0)
