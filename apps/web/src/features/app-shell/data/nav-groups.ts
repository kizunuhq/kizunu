import type { NavGroup } from '@kizunu/web/features/app-shell/data/nav-group'
import {
  AddressBook,
  ChartLineUp,
  Lightning,
  Plugs,
  PlugsConnected,
  ShieldCheck,
  Stack,
  UsersThree,
} from '@phosphor-icons/react'

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Operations',
    items: [
      { to: '/workspace', label: 'Overview', icon: ChartLineUp },
      { to: '/workspace/journeys', label: 'Journeys', icon: Lightning },
      { to: '/workspace/cadences', label: 'Cadences', icon: Stack },
      { to: '/workspace/my-channels', label: 'My channels', icon: AddressBook },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { to: '/workspace/members', label: 'Members', icon: UsersThree },
      { to: '/workspace/channels', label: 'Channels', icon: Plugs },
      { to: '/workspace/connectors', label: 'Connectors', icon: PlugsConnected },
      { to: '/workspace/security', label: 'Security', icon: ShieldCheck },
    ],
  },
]
