import type { NavGroupItem } from '@kizunu/web/_shell/app-shell/data/nav-group-item'
import { NavItem } from '@kizunu/web/_shell/app-shell/nav-item'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
} from '@kizunu/web/components/primitives/sidebar'

interface NavGroupProps {
  label: string
  items: NavGroupItem[]
}

export function NavGroup({ label, items }: NavGroupProps) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="font-mono tracking-wide uppercase">{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <NavItem key={item.to} item={item} />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
