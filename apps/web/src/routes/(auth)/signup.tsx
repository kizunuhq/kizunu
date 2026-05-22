import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(auth)/signup')({
  component: SignupPage,
})

function SignupPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">Create your workspace</h1>
      <p className="text-sm text-neutral-500">TODO: signup form</p>
    </div>
  )
}
