export const COMMAND_GROUP = {
  Pages: 'Pages',
  Settings: 'Settings',
  Account: 'Account',
} as const

export type CommandGroupName = (typeof COMMAND_GROUP)[keyof typeof COMMAND_GROUP]

export interface NavigateCommand {
  kind: 'navigate'
  id: string
  label: string
  group: CommandGroupName
  to: string
}

export interface ActionCommand {
  kind: 'action'
  id: string
  label: string
  group: CommandGroupName
}

export type CommandItem = NavigateCommand | ActionCommand

export const NAVIGATE_COMMANDS: NavigateCommand[] = [
  { kind: 'navigate', id: 'nav-overview', label: 'Overview', group: 'Pages', to: '/workspace' },
  {
    kind: 'navigate',
    id: 'nav-journeys',
    label: 'Journeys',
    group: 'Pages',
    to: '/workspace/journeys',
  },
  {
    kind: 'navigate',
    id: 'nav-cadences',
    label: 'Cadences',
    group: 'Pages',
    to: '/workspace/cadences',
  },
  {
    kind: 'navigate',
    id: 'nav-my-channels',
    label: 'My channels',
    group: 'Pages',
    to: '/workspace/my-channels',
  },
  {
    kind: 'navigate',
    id: 'nav-settings-profile',
    label: 'Profile',
    group: 'Settings',
    to: '/settings/profile',
  },
  {
    kind: 'navigate',
    id: 'nav-settings-workspace',
    label: 'Workspace',
    group: 'Settings',
    to: '/settings/workspace',
  },
  {
    kind: 'navigate',
    id: 'nav-settings-members',
    label: 'Members',
    group: 'Settings',
    to: '/settings/members',
  },
  {
    kind: 'navigate',
    id: 'nav-settings-channels',
    label: 'Channels',
    group: 'Settings',
    to: '/settings/channels',
  },
  {
    kind: 'navigate',
    id: 'nav-settings-connectors',
    label: 'Connectors',
    group: 'Settings',
    to: '/settings/connectors',
  },
  {
    kind: 'navigate',
    id: 'nav-settings-security',
    label: 'Security',
    group: 'Settings',
    to: '/settings/security',
  },
  {
    kind: 'navigate',
    id: 'nav-settings-billing',
    label: 'Billing',
    group: 'Settings',
    to: '/settings/billing',
  },
]

export const ACCOUNT_COMMANDS: ActionCommand[] = [
  { kind: 'action', id: 'action-sign-out', label: 'Sign out', group: 'Account' },
]
