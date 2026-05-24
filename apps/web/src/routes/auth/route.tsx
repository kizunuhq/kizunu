import { AuthBrandingPanel } from '@kizunu/web/routes/auth/-components/auth-branding-panel'
import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/auth')({
  component: AuthLayout,
})

function AuthLayout() {
  return (
    <div className="grid min-h-dvh md:grid-cols-[minmax(420px,_1fr)_minmax(420px,_540px)]">
      <AuthBrandingPanel />
      <main className="flex w-full items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-[420px]">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
