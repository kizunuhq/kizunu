import { NAV_GROUPS } from '@kizunu/web/_shell/app-shell/data/nav-groups'
import { NavGroup } from '@kizunu/web/_shell/app-shell/nav-group'
import { UserDropdown } from '@kizunu/web/_shell/app-shell/user-dropdown'
import { WorkspaceSwitcher } from '@kizunu/web/_shell/app-shell/workspace-switcher'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@kizunu/web/components/primitives/sidebar'

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
