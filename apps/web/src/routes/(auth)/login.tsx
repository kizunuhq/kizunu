import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(auth)/login')({
  component: LoginPage,
})

function LoginPage() {
  return (
    <div className="space-y-2">
      <h1 className="font-semibold text-2xl">Sign in</h1>
      <p className="text-neutral-500 text-sm">TODO: login form</p>
    </div>
  )
}
