import { VerifyEmailPanel } from '@kizunu/web/features/identity/components/verify-email-panel'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(auth)/verify-email')({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === 'string' ? search.token : '',
  }),
  component: VerifyEmailPage,
})

function VerifyEmailPage() {
  const { token } = Route.useSearch()

  return <VerifyEmailPanel token={token} />
}
