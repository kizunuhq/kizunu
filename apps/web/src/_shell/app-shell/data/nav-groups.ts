import type { NavGroup } from '@kizunu/web/_shell/app-shell/data/nav-group'
import {
  AddressBook,
  ChartLineUp,
  ClockClockwise,
  Compass,
  Gear,
  Lightning,
  Stack,
} from '@phosphor-icons/react'

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Operations',
    items: [
      { to: '/workspace', label: 'Overview', icon: ChartLineUp },
      { to: '/workspace/journeys', label: 'Journeys', icon: Lightning },
      { to: '/workspace/cadences', label: 'Cadences', icon: Stack },
      { to: '/workspace/my-channels', label: 'My channels', icon: AddressBook },
      { to: '/workspace/audit', label: 'Audit', icon: ClockClockwise },
    ],
  },
  {
    label: 'Manage',
    items: [
      { to: '/setup', label: 'Setup', icon: Compass },
      { to: '/settings/profile', label: 'Settings', icon: Gear },
    ],
  },
]
