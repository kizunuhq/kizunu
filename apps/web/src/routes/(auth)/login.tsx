import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(auth)/login')({
  component: LoginPage,
})

function LoginPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="text-sm text-neutral-500">TODO: login form</p>
    </div>
  )
}
