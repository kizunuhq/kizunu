import { useCadences } from '@kizunu/api-client/cadence/use-cadences'
import { useTemplates } from '@kizunu/api-client/cadence/use-templates'
import { useWorkspaceChannels } from '@kizunu/api-client/channel/use-workspace-channels'
import { useWorkspaceConnectors } from '@kizunu/api-client/crm/use-workspace-connectors'
import { useEntryTriggers } from '@kizunu/api-client/engine/use-entry-triggers'
import { useCurrentUser } from '@kizunu/api-client/identity/use-current-user'
import { useRoutingReadiness } from '@kizunu/api-client/workspace/use-routing-readiness'
import { PageHeader } from '@kizunu/web/components/composed/page-header'
import { Badge } from '@kizunu/web/components/primitives/badge'
import { Button } from '@kizunu/web/components/primitives/button'
import { Card, CardContent, CardHeader, CardTitle } from '@kizunu/web/components/primitives/card'
import { CreateChannelAccountDialog } from '@kizunu/web/routes/_app/settings/channels/-dialogs/create-channel-account-dialog'
import { CreateConnectorAccountDialog } from '@kizunu/web/routes/_app/settings/connectors/-dialogs/create-connector-account-dialog'
import { CreateEntryTriggerDialog } from '@kizunu/web/routes/_app/settings/connectors/-dialogs/create-entry-trigger-dialog'
import { CreateCadenceDialog } from '@kizunu/web/routes/_app/workspace/cadences/-dialogs/create-cadence-dialog'
import { CreateTemplateDialog } from '@kizunu/web/routes/_app/workspace/cadences/-dialogs/create-template-dialog'
import { CaretRight, CheckCircle, Circle, Plus, Spinner } from '@phosphor-icons/react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/_app/setup/')({
  component: SetupPage,
})

type StepStatus = 'done' | 'pending' | 'loading'
type WizardDialog = 'connector' | 'channel' | 'template' | 'cadence' | 'trigger' | null

interface SetupStep {
  id: string
  title: string
  description: string
  to: string
  status: StepStatus
  inlineDialog?: Exclude<WizardDialog, null>
  actionLabel?: string
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
  const [openDialog, setOpenDialog] = useState<WizardDialog>(null)

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
      inlineDialog: 'connector',
      actionLabel: 'Add connector',
    },
    {
      id: 'channel',
      title: 'Connect WhatsApp',
      description: 'Add a Meta Cloud API or Coex channel account.',
      to: '/settings/channels',
      status: statusFromCount(channels.isPending, channels.data?.accounts.length ?? 0),
      inlineDialog: 'channel',
      actionLabel: 'Add channel',
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
      inlineDialog: 'template',
      actionLabel: 'New template',
    },
    {
      id: 'cadence',
      title: 'Create cadence',
      description: 'Order the touches and pick the templates they send.',
      to: '/workspace/cadences',
      status: statusFromCount(cadences.isPending, cadences.data?.cadences.length ?? 0),
      inlineDialog: 'cadence',
      actionLabel: 'New cadence',
    },
    {
      id: 'trigger',
      title: 'Set entry trigger',
      description: 'Map a Pipedrive stage → cadence to start ingesting deals.',
      to: '/settings/connectors',
      status: statusFromCount(triggers.isPending, triggers.data?.entryTriggers.length ?? 0),
      inlineDialog: 'trigger',
      actionLabel: 'Add entry trigger',
    },
  ]

  const overall = computeOverallReadiness(steps)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Setup"
        description="Walk through the six steps the pilot needs in order."
      />
      <ReadinessBanner overall={overall} />
      <Card>
        <CardHeader>
          <CardTitle>Pilot checklist</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {steps.map((step) => (
            <SetupStepRow key={step.id} step={step} onOpenDialog={setOpenDialog} />
          ))}
        </CardContent>
      </Card>
      <CreateConnectorAccountDialog
        workspaceId={activeWorkspaceId}
        open={openDialog === 'connector'}
        onOpenChange={(next) => setOpenDialog(next ? 'connector' : null)}
      />
      <CreateChannelAccountDialog
        workspaceId={activeWorkspaceId}
        open={openDialog === 'channel'}
        onOpenChange={(next) => setOpenDialog(next ? 'channel' : null)}
      />
      <CreateTemplateDialog
        workspaceId={activeWorkspaceId}
        open={openDialog === 'template'}
        onOpenChange={(next) => setOpenDialog(next ? 'template' : null)}
      />
      <CreateCadenceDialog
        workspaceId={activeWorkspaceId}
        open={openDialog === 'cadence'}
        onOpenChange={(next) => setOpenDialog(next ? 'cadence' : null)}
      />
      <CreateEntryTriggerDialog
        workspaceId={activeWorkspaceId}
        open={openDialog === 'trigger'}
        onOpenChange={(next) => setOpenDialog(next ? 'trigger' : null)}
      />
    </div>
  )
}

interface SetupStepRowProps {
  step: SetupStep
  onOpenDialog: (dialog: WizardDialog) => void
}

function SetupStepRow({ step, onOpenDialog }: SetupStepRowProps) {
  const showInlineAction =
    step.inlineDialog !== undefined && step.actionLabel !== undefined && step.status === 'pending'
  return (
    <div className="hover:bg-muted/30 border-border bg-background flex items-center justify-between rounded-md border p-4 transition-colors">
      <Link to={step.to} className="flex flex-1 items-center gap-3">
        <StepIcon status={step.status} />
        <div className="flex flex-col">
          <span className="font-medium">{step.title}</span>
          <span className="text-muted-foreground text-sm">{step.description}</span>
        </div>
      </Link>
      <div className="flex items-center gap-3">
        <StepBadge status={step.status} />
        {showInlineAction ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onOpenDialog(step.inlineDialog ?? null)
            }}
          >
            <Plus weight="bold" />
            {step.actionLabel}
          </Button>
        ) : (
          <CaretRight weight="bold" className="text-muted-foreground" />
        )}
      </div>
    </div>
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

type OverallReadiness = 'ready' | 'pending' | 'loading'

function computeOverallReadiness(steps: SetupStep[]): OverallReadiness {
  if (steps.some((step) => step.status === 'loading')) return 'loading'
  if (steps.every((step) => step.status === 'done')) return 'ready'
  return 'pending'
}

function ReadinessBanner({ overall }: { overall: OverallReadiness }) {
  if (overall === 'loading') {
    return (
      <Card className="border-border bg-muted/30">
        <CardContent className="text-muted-foreground py-4 text-sm">
          Checking readiness…
        </CardContent>
      </Card>
    )
  }
  if (overall === 'ready') {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="py-4 text-sm text-green-900">
          All systems ready — launch when you are.
        </CardContent>
      </Card>
    )
  }
  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardContent className="py-4 text-sm text-amber-900">
        Not ready — complete the steps below before launching the pilot.
      </CardContent>
    </Card>
  )
}
