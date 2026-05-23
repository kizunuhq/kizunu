import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@kizunu/web/components/primitives/sidebar'
import { NavGroup } from '@kizunu/web/features/app-shell/components/nav-group'
import { UserDropdown } from '@kizunu/web/features/app-shell/components/user-dropdown'
import { WorkspaceSwitcher } from '@kizunu/web/features/app-shell/components/workspace-switcher'
import { NAV_GROUPS } from '@kizunu/web/features/app-shell/data/nav-groups'

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <WorkspaceSwitcher />
      </SidebarHeader>
      <SidebarContent>
        {NAV_GROUPS.map((group) => (
          <NavGroup key={group.label} label={group.label} items={group.items} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <UserDropdown />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
