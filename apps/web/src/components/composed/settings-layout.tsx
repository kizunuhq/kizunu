import { cn } from '@kizunu/web/lib/utils'
import { Link, useMatchRoute } from '@tanstack/react-router'
import type { ReactNode } from 'react'

interface SettingsNavItem {
  to: string
  label: string
}

interface SettingsLayoutProps {
  navItems: SettingsNavItem[]
  children: ReactNode
}

export function SettingsLayout({ navItems, children }: SettingsLayoutProps) {
  return (
    <div className="grid gap-6 md:grid-cols-[200px_1fr]">
      <SettingsNav items={navItems} />
      <div className="min-w-0">{children}</div>
    </div>
  )
}

function SettingsNav({ items }: { items: SettingsNavItem[] }) {
  const matchRoute = useMatchRoute()
  return (
    <nav className="flex flex-col gap-1 text-sm">
      {items.map((item) => (
        <SettingsNavLink
          key={item.to}
          to={item.to}
          label={item.label}
          isActive={Boolean(matchRoute({ to: item.to, fuzzy: true }))}
        />
      ))}
    </nav>
  )
}

interface SettingsNavLinkProps {
  to: string
  label: string
  isActive: boolean
}

function SettingsNavLink({ to, label, isActive }: SettingsNavLinkProps) {
  return (
    <Link
      to={to}
      className={cn(
        'hover:bg-accent rounded-[2px] px-3 py-1.5 transition-colors',
        isActive ? 'bg-background-300 text-foreground' : 'text-muted-foreground',
      )}
    >
      {label}
    </Link>
  )
}
