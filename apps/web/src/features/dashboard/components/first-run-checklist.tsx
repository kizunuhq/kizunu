import { useCadences } from '@kizunu/api-client/cadence/use-cadences'
import { useTemplates } from '@kizunu/api-client/cadence/use-templates'
import { useWorkspaceChannels } from '@kizunu/api-client/channel/use-workspace-channels'
import { useWorkspaceConnectors } from '@kizunu/api-client/crm/use-workspace-connectors'
import { useCurrentUser } from '@kizunu/api-client/identity/use-current-user'
import { buttonVariants } from '@kizunu/web/components/primitives/button'
import { CheckCircle, Circle } from '@phosphor-icons/react'
import { Link } from '@tanstack/react-router'

interface ChecklistItemModel {
  label: string
  done: boolean
  toHref: string
}

export function FirstRunChecklist({ workspaceId }: { workspaceId: string | undefined }) {
  const items = useChecklistItems(workspaceId)
  const allDone = items.every((item) => item.done)
  if (allDone) return null

  return (
    <section className="border-border flex flex-col gap-3 rounded-[2px] border p-4">
      <header className="flex flex-col gap-1">
        <p className="text-kizunu-green font-mono text-xs font-medium">[Get started]</p>
        <h2 className="text-foreground text-base font-medium">Finish setting up your workspace</h2>
      </header>
      <ul className="divide-border flex flex-col divide-y">
        {items.map((item) => (
          <ChecklistItem key={item.label} {...item} />
        ))}
      </ul>
    </section>
  )
}

function ChecklistItem({ label, done, toHref }: ChecklistItemModel) {
  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <div className="flex items-center gap-2">
        {done ? (
          <CheckCircle weight="fill" className="text-kizunu-green size-4" />
        ) : (
          <Circle className="text-muted-foreground size-4" />
        )}
        <span className="text-foreground text-sm">{label}</span>
      </div>
      {!done ? (
        <Link to={toHref} className={buttonVariants({ variant: 'ghost', size: 'xs' })}>
          Go
        </Link>
      ) : null}
    </li>
  )
}

function useChecklistItems(workspaceId: string | undefined): ChecklistItemModel[] {
  const { user } = useCurrentUser()
  const channels = useWorkspaceChannels(workspaceId)
  const cadences = useCadences(workspaceId)
  const templates = useTemplates(workspaceId)
  const connectors = useWorkspaceConnectors(workspaceId)
  return [
    {
      label: 'Verify your email',
      done: Boolean(user?.emailVerifiedAt),
      toHref: '/auth/verify-email',
    },
    {
      label: 'Connect a channel',
      done: (channels.data?.accounts.length ?? 0) > 0,
      toHref: '/workspace/channels',
    },
    {
      label: 'Create a template',
      done: (templates.data?.templates.length ?? 0) > 0,
      toHref: '/workspace/cadences',
    },
    {
      label: 'Create a cadence',
      done: (cadences.data?.cadences.length ?? 0) > 0,
      toHref: '/workspace/cadences',
    },
    {
      label: 'Connect a CRM',
      done: (connectors.data?.accounts.length ?? 0) > 0,
      toHref: '/workspace/connectors',
    },
  ]
}
