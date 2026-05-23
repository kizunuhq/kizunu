import { SettingsLayout } from '@kizunu/web/components/composed/settings-layout'
import { createFileRoute, Outlet } from '@tanstack/react-router'

const SETTINGS_NAV_ITEMS = [
  { to: '/settings/profile', label: 'Profile' },
  { to: '/settings/workspace', label: 'Workspace' },
  { to: '/settings/members', label: 'Members' },
  { to: '/settings/channels', label: 'Channels' },
  { to: '/settings/connectors', label: 'Connectors' },
  { to: '/settings/security', label: 'Security' },
  { to: '/settings/billing', label: 'Billing' },
]

export const Route = createFileRoute('/_app/settings')({
  component: SettingsRouteLayout,
})

function SettingsRouteLayout() {
  return (
    <SettingsLayout navItems={SETTINGS_NAV_ITEMS}>
      <Outlet />
    </SettingsLayout>
  )
}
