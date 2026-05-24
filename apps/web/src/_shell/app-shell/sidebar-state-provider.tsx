import { SidebarProvider, useSidebar } from '@kizunu/web/components/primitives/sidebar'
import { type ReactNode, useEffect } from 'react'

const STORAGE_KEY = 'kizunu.sidebar.open'

interface SidebarStateProviderProps {
  children: ReactNode
}

export function SidebarStateProvider({ children }: SidebarStateProviderProps) {
  const initialOpen = readPersistedOpen()
  return (
    <SidebarProvider defaultOpen={initialOpen}>
      <SidebarPersist />
      {children}
    </SidebarProvider>
  )
}

function SidebarPersist() {
  const { open } = useSidebar()
  useEffect(() => {
    writePersistedOpen(open)
  }, [open])
  return null
}

function readPersistedOpen(): boolean {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === null) return true
    return raw === 'true'
  } catch {
    return true
  }
}

function writePersistedOpen(open: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(open))
  } catch {
    // localStorage may be unavailable in private mode; persistence is best-effort
  }
}
