import { useCadences } from '@kizunu/api-client/cadence/use-cadences'
import { useTemplates } from '@kizunu/api-client/cadence/use-templates'
import { useWorkspaceChannels } from '@kizunu/api-client/channel/use-workspace-channels'
import { useWorkspaceConnectors } from '@kizunu/api-client/crm/use-workspace-connectors'
import { useEntryTriggers } from '@kizunu/api-client/engine/use-entry-triggers'
import { useCurrentUser } from '@kizunu/api-client/identity/use-current-user'
import { useRoutingReadiness } from '@kizunu/api-client/workspace/use-routing-readiness'
import { PageHeader } from '@kizunu/web/components/composed/page-header'
import { Badge } from '@kizunu/web/components/primitives/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@kizunu/web/components/primitives/card'
import { CaretRight, CheckCircle, Circle, Spinner } from '@phosphor-icons/react'
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/setup/')({
  component: SetupPage,
})

type StepStatus = 'done' | 'pending' | 'loading'

interface SetupStep {
  id: string
  title: string
  description: string
  to: string
  status: StepStatus
}

function statusFromCount(isPending: boolean, count: number): StepStatus {
  if (isPending) return 'loading'
  if (count > 0) return 'done'
  return 'pending'
}

function SetupPage() {
  const { activeWorkspaceId: rawWorkspaceId } = useCurrentUser()
  const activeWorkspaceId = rawWorkspaceId ?? undefined
  const connectors = useWorkspaceConnectors(activeWorkspaceId)
  const channels = useWorkspaceChannels(activeWorkspaceId)
  const routing = useRoutingReadiness(activeWorkspaceId)
  const templates = useTemplates(activeWorkspaceId)
  const cadences = useCadences(activeWorkspaceId)
  const triggers = useEntryTriggers(activeWorkspaceId)

  if (!activeWorkspaceId) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Setup" description="Guided pilot configuration." />
        <p className="text-muted-foreground text-sm">No active workspace selected.</p>
      </div>
    )
  }

  const routingReady = (routing.data?.members ?? []).filter((member) => member.status === 'active')
  const routingDone =
    routingReady.length > 0 && routingReady.every((member) => member.hasPrimaryWhatsappChannel)
  const routingStatus: StepStatus = routing.isPending ? 'loading' : routingDone ? 'done' : 'pending'

  const steps: SetupStep[] = [
    {
      id: 'connector',
      title: 'Connect Pipedrive',
      description: 'Paste your Pipedrive API token to enable CRM-driven cadences.',
      to: '/settings/connectors',
      status: statusFromCount(connectors.isPending, connectors.data?.accounts.length ?? 0),
    },
    {
      id: 'channel',
      title: 'Connect WhatsApp',
      description: 'Add a Meta Cloud API or Coex channel account.',
      to: '/settings/channels',
      status: statusFromCount(channels.isPending, channels.data?.accounts.length ?? 0),
    },
    {
      id: 'routing',
      title: 'Map BDR routing',
      description: 'Every active member needs access to a primary WhatsApp channel.',
      to: '/settings/members',
      status: routingStatus,
    },
    {
      id: 'templates',
      title: 'Create templates',
      description: 'Register at least one approved Meta template.',
      to: '/workspace/cadences',
      status: statusFromCount(templates.isPending, templates.data?.templates.length ?? 0),
    },
    {
      id: 'cadence',
      title: 'Create cadence',
      description: 'Order the touches and pick the templates they send.',
      to: '/workspace/cadences',
      status: statusFromCount(cadences.isPending, cadences.data?.cadences.length ?? 0),
    },
    {
      id: 'trigger',
      title: 'Set entry trigger',
      description: 'Map a Pipedrive stage → cadence to start ingesting deals.',
      to: '/settings/connectors',
      status: statusFromCount(triggers.isPending, triggers.data?.entryTriggers.length ?? 0),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Setup"
        description="Walk through the six steps the pilot needs in order."
      />
      <Card>
        <CardHeader>
          <CardTitle>Pilot checklist</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {steps.map((step) => (
            <SetupStepRow key={step.id} step={step} />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function SetupStepRow({ step }: { step: SetupStep }) {
  return (
    <Link
      to={step.to}
      className="hover:bg-muted/30 border-border bg-background flex items-center justify-between rounded-md border p-4 transition-colors"
    >
      <div className="flex items-center gap-3">
        <StepIcon status={step.status} />
        <div className="flex flex-col">
          <span className="font-medium">{step.title}</span>
          <span className="text-muted-foreground text-sm">{step.description}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <StepBadge status={step.status} />
        <CaretRight weight="bold" className="text-muted-foreground" />
      </div>
    </Link>
  )
}

function StepIcon({ status }: { status: StepStatus }) {
  if (status === 'loading') return <Spinner className="text-muted-foreground animate-spin" />
  if (status === 'done') return <CheckCircle weight="fill" className="text-green-600" />
  return <Circle weight="regular" className="text-muted-foreground" />
}

function StepBadge({ status }: { status: StepStatus }) {
  if (status === 'loading') return <Badge variant="outline">Checking…</Badge>
  if (status === 'done') return <Badge variant="default">Done</Badge>
  return <Badge variant="secondary">Not started</Badge>
}
