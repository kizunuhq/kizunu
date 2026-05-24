import { SidebarTrigger } from '@kizunu/web/components/primitives/sidebar'

export function TopBar() {
  return (
    <header className="border-border bg-background sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-dashed px-4 md:px-6">
      <SidebarTrigger className="md:hidden" />
    </header>
  )
}
