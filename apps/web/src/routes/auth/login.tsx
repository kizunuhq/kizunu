import { useAuthCapabilities } from '@kizunu/api-client/identity/use-auth-capabilities'
import { useCurrentUser } from '@kizunu/api-client/identity/use-current-user'
import { LoginForm } from '@kizunu/web/features/identity/components/login-form'
import { OAuthButtons } from '@kizunu/web/features/identity/components/oauth-buttons'
import { OAuthErrorAlert } from '@kizunu/web/features/identity/components/oauth-error-alert'
import { OAuthSeparator } from '@kizunu/web/features/identity/components/oauth-separator'
import { createFileRoute, Navigate, useNavigate } from '@tanstack/react-router'

interface LoginSearch {
  error?: string
  next?: string
}

export const Route = createFileRoute('/auth/login')({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    error: typeof search.error === 'string' ? search.error : undefined,
    next: typeof search.next === 'string' ? search.next : undefined,
  }),
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const { user, isPending } = useCurrentUser()
  const capabilities = useAuthCapabilities()
  const { error, next } = Route.useSearch()

  if (isPending) return null
  if (user) return <Navigate replace to={next ?? '/workspace'} />

  const providers = capabilities.data?.oauthProviders ?? []
  const hasProviders = providers.length > 0

  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <OAuthErrorAlert
          code={error}
          onDismiss={() => navigate({ to: '/auth/login', search: { next }, replace: true })}
        />
      ) : null}
      <LoginForm />
      {hasProviders ? (
        <>
          <OAuthSeparator />
          <OAuthButtons />
        </>
      ) : null}
    </div>
  )
}
