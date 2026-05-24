import { useCurrentUser } from '@kizunu/api-client/identity/use-current-user'
import { useSwitchWorkspace } from '@kizunu/api-client/identity/use-switch-workspace'
import { Popover, PopoverContent, PopoverTrigger } from '@kizunu/web/components/primitives/popover'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@kizunu/web/components/primitives/sidebar'
import { getApiErrorMessage } from '@kizunu/web/lib/get-api-error-message'
import { cn } from '@kizunu/web/lib/utils'
import { CaretUpDown, Check } from '@phosphor-icons/react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'

export function WorkspaceSwitcher() {
  const { memberships, activeWorkspaceId } = useCurrentUser()
  const activeMembership = memberships.find((m) => m.workspaceId === activeWorkspaceId)
  if (memberships.length <= 1)
    return <SingleWorkspaceHeader label={activeMembership?.workspaceName} />
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Popover>
          <PopoverTrigger
            render={
              <SidebarMenuButton size="lg" className="data-popup-open:bg-sidebar-accent">
                <WorkspaceLabel name={activeMembership?.workspaceName ?? 'Select workspace'} />
                <CaretUpDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
              </SidebarMenuButton>
            }
          />
          <WorkspacePopoverContent />
        </Popover>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function SingleWorkspaceHeader({ label }: { label?: string }) {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="flex h-12 items-center px-2 group-data-[collapsible=icon]:justify-center">
          <WorkspaceLabel name={label ?? '—'} />
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function WorkspaceLabel({ name }: { name: string }) {
  return (
    <div className="flex flex-1 flex-col text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
      <span className="text-muted-foreground font-mono text-[10px] tracking-wide uppercase">
        Workspace
      </span>
      <span className="truncate font-medium">{name}</span>
    </div>
  )
}

function WorkspacePopoverContent() {
  const navigate = useNavigate()
  const { memberships, activeWorkspaceId } = useCurrentUser()
  const { switchWorkspace, isPending } = useSwitchWorkspace({
    onSuccess: () => navigate({ to: '/workspace' }),
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
  return (
    <PopoverContent className="w-(--anchor-width) min-w-56 p-1" align="start" sideOffset={4}>
      <div className="flex flex-col gap-0.5">
        {memberships.map((membership) => {
          const isActive = membership.workspaceId === activeWorkspaceId
          return (
            <button
              key={membership.workspaceId}
              type="button"
              disabled={isPending}
              onClick={() => switchWorkspace({ workspaceId: membership.workspaceId })}
              className={cn(
                'hover:bg-accent flex items-center justify-between rounded-[2px] px-2 py-1.5 text-left text-sm transition-colors disabled:opacity-50',
                isActive && 'bg-background-300',
              )}
            >
              <span className="truncate">{membership.workspaceName}</span>
              {isActive ? <Check className="size-4" /> : null}
            </button>
          )
        })}
      </div>
    </PopoverContent>
  )
}
