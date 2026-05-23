import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { Toaster } from 'sonner'

import '../styles.css'
import { ThemeProvider } from '../_shell/providers/theme-provider'
import { TooltipProvider } from '../components/primitives/tooltip'

const TOOLTIP_DELAY_MS = 700

interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
})

function RootComponent() {
  return (
    <ThemeProvider>
      <TooltipProvider delay={TOOLTIP_DELAY_MS}>
        <Outlet />
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  )
}
