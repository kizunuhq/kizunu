import { useLogout } from '@kizunu/api-client/identity/use-logout'
import { Button } from '@kizunu/web/components/primitives/button'
import { EmailVerificationBanner } from '@kizunu/web/features/identity/components/email-verification-banner'
import { Link, Outlet, useNavigate } from '@tanstack/react-router'

const NAV_LINKS = [
  { to: '/workspace', label: 'Overview' },
  { to: '/workspace/members', label: 'Members' },
  { to: '/workspace/channels', label: 'Channels' },
  { to: '/workspace/connectors', label: 'Connectors' },
  { to: '/workspace/cadences', label: 'Cadences' },
  { to: '/workspace/journeys', label: 'Journeys' },
  { to: '/workspace/my-channels', label: 'My channels' },
  { to: '/workspace/security', label: 'Security' },
] as const

export function AppShell({ userName }: { userName: string }) {
  const navigate = useNavigate()
  const logout = useLogout()

  function signOut() {
    logout.mutate(undefined, { onSuccess: () => navigate({ to: '/login' }) })
  }

  return (
    <div className="min-h-dvh">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <nav className="flex items-center gap-4">
          <span className="font-semibold">Kizunu</span>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-muted-foreground [&.active]:text-foreground text-sm"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-sm">{userName}</span>
          <Button variant="outline" size="sm" disabled={logout.isPending} onClick={signOut}>
            Log out
          </Button>
        </div>
      </header>
      <EmailVerificationBanner />
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  )
}
