import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(auth)/signup')({
  component: SignupPage,
})

function SignupPage() {
  return (
    <div className="space-y-2">
      <h1 className="font-semibold text-2xl">Create your workspace</h1>
      <p className="text-neutral-500 text-sm">TODO: signup form</p>
    </div>
  )
}
