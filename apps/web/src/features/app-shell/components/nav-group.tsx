import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
} from '@kizunu/web/components/primitives/sidebar'
import { NavItem } from '@kizunu/web/features/app-shell/components/nav-item'
import type { NavGroupItem } from '@kizunu/web/features/app-shell/data/nav-group-item'

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
