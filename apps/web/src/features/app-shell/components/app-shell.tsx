import { SidebarInset, useSidebar } from '@kizunu/web/components/primitives/sidebar'
import { AppSidebar } from '@kizunu/web/features/app-shell/components/app-sidebar'
import { SidebarStateProvider } from '@kizunu/web/features/app-shell/components/sidebar-state-provider'
import { TopBar } from '@kizunu/web/features/app-shell/components/top-bar'
import { CommandPalette } from '@kizunu/web/features/command/components/command-palette'
import { ShortcutsModal } from '@kizunu/web/features/command/components/shortcuts-modal'
import { EmailVerificationBanner } from '@kizunu/web/features/identity/components/email-verification-banner'
import { useHotkey } from '@kizunu/web/hooks/use-hotkey'
import { Outlet } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

export function AppShell() {
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  return (
    <SidebarStateProvider>
      <ShellHotkey
        onTogglePalette={() => setPaletteOpen((value) => !value)}
        onToggleShortcuts={() => setShortcutsOpen((value) => !value)}
      />
      <AppSidebar />
      <SidebarInset>
        <TopBar />
        <EmailVerificationBanner />
        <main className="flex-1 px-4 py-6 md:px-6">
          <Outlet />
        </main>
      </SidebarInset>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <ShortcutsModal open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </SidebarStateProvider>
  )
}

interface ShellHotkeyProps {
  onTogglePalette: () => void
  onToggleShortcuts: () => void
}

function ShellHotkey({ onTogglePalette, onToggleShortcuts }: ShellHotkeyProps) {
  const { toggleSidebar } = useSidebar()
  useHotkey('[', toggleSidebar)
  useHotkey('?', onToggleShortcuts)
  useCmdK(onTogglePalette)
  return null
}

function useCmdK(handler: () => void) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'k') return
      if (!event.metaKey && !event.ctrlKey) return
      event.preventDefault()
      handler()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [handler])
}
