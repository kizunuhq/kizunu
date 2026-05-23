import { SidebarInset, useSidebar } from '@kizunu/web/components/primitives/sidebar'
import { AppSidebar } from '@kizunu/web/features/app-shell/components/app-sidebar'
import { SidebarStateProvider } from '@kizunu/web/features/app-shell/components/sidebar-state-provider'
import { TopBar } from '@kizunu/web/features/app-shell/components/top-bar'
import { EmailVerificationBanner } from '@kizunu/web/features/identity/components/email-verification-banner'
import { useHotkey } from '@kizunu/web/hooks/use-hotkey'
import { Outlet } from '@tanstack/react-router'

export function AppShell() {
  return (
    <SidebarStateProvider>
      <ShellHotkey />
      <AppSidebar />
      <SidebarInset>
        <TopBar />
        <EmailVerificationBanner />
        <main className="flex-1 px-4 py-6 md:px-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarStateProvider>
  )
}

function ShellHotkey() {
  const { toggleSidebar } = useSidebar()
  useHotkey('[', toggleSidebar)
  return null
}
