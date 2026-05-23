import { useLogout } from '@kizunu/api-client/identity/use-logout'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@kizunu/web/components/primitives/command'
import {
  ACCOUNT_COMMANDS,
  COMMAND_GROUP,
  NAVIGATE_COMMANDS,
  type NavigateCommand,
} from '@kizunu/web/features/command/data/command-items'
import { useNavigate } from '@tanstack/react-router'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate()
  const logout = useLogout()
  const pageCommands = NAVIGATE_COMMANDS.filter((c) => c.group === COMMAND_GROUP.Pages)
  const settingsCommands = NAVIGATE_COMMANDS.filter((c) => c.group === COMMAND_GROUP.Settings)

  function go(command: NavigateCommand) {
    onOpenChange(false)
    void navigate({ to: command.to, search: searchFor(command.to) })
  }

  function signOut() {
    onOpenChange(false)
    logout.mutate(undefined, { onSuccess: () => navigate({ to: '/auth/login' }) })
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search pages, settings, actions…" />
      <CommandList>
        <CommandEmpty>No matches.</CommandEmpty>
        <CommandGroup heading={COMMAND_GROUP.Pages}>
          {pageCommands.map((command) => (
            <CommandItem key={command.id} value={command.label} onSelect={() => go(command)}>
              {command.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading={COMMAND_GROUP.Settings}>
          {settingsCommands.map((command) => (
            <CommandItem key={command.id} value={command.label} onSelect={() => go(command)}>
              {command.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading={COMMAND_GROUP.Account}>
          {ACCOUNT_COMMANDS.map((command) => (
            <CommandItem key={command.id} value={command.label} onSelect={signOut}>
              {command.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}

function searchFor(to: string): Record<string, string> {
  if (to === '/workspace/journeys') return { status: 'all' }
  if (to === '/workspace/cadences') return { tab: 'cadences' }
  return {}
}
