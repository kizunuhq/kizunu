import { SidebarMenuButton, SidebarMenuItem } from '@kizunu/web/components/primitives/sidebar'
import type { NavGroupItem } from '@kizunu/web/features/app-shell/data/nav-group-item'
import { Link, useMatchRoute } from '@tanstack/react-router'

interface NavItemProps {
  item: NavGroupItem
}

export function NavItem({ item }: NavItemProps) {
  const matchRoute = useMatchRoute()
  const isActive = Boolean(matchRoute({ to: item.to, fuzzy: true }))
  const Icon = item.icon
  return (
    <SidebarMenuItem>
      <SidebarMenuButton isActive={isActive} tooltip={item.label} render={<Link to={item.to} />}>
        <Icon />
        <span>{item.label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
