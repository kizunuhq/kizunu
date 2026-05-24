import { useAuthCapabilities } from '@kizunu/api-client/identity/use-auth-capabilities'
import { useCurrentUser } from '@kizunu/api-client/identity/use-current-user'
import { useLogin } from '@kizunu/api-client/identity/use-login'
import { PageHeader } from '@kizunu/web/components/composed/page-header'
import { Button } from '@kizunu/web/components/primitives/button'
import { LoginForm } from '@kizunu/web/routes/auth/-components/login-form'
import { OAuthButtons } from '@kizunu/web/routes/auth/-components/oauth-buttons'
import { OAuthErrorAlert } from '@kizunu/web/routes/auth/-components/oauth-error-alert'
import { OAuthSeparator } from '@kizunu/web/routes/auth/-components/oauth-separator'
import { mapLoginError } from '@kizunu/web/routes/auth/-utils/login-error-copy'
import { createFileRoute, Link, Navigate, useNavigate } from '@tanstack/react-router'

interface LoginSearch {
  error?: string
  next?: string
}

const FORM_ID = 'login-form'

export const Route = createFileRoute('/auth/login')({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    error: typeof search.error === 'string' ? search.error : undefined,
    next: typeof search.next === 'string' ? search.next : undefined,
  }),
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const { user, isPending: isUserPending } = useCurrentUser()
  const capabilities = useAuthCapabilities()
  const { error: oauthError, next } = Route.useSearch()
  const {
    login,
    isPending,
    isError,
    error: loginError,
  } = useLogin({ onSuccess: () => navigate({ to: next ?? '/workspace' }) })
  const errorCopy = isError ? mapLoginError(loginError) : null

  if (isUserPending) return null
  if (user) return <Navigate replace to={next ?? '/workspace'} />

  const hasProviders = (capabilities.data?.oauthProviders ?? []).length > 0

  return (
    <div className="flex flex-col gap-6">
      {oauthError ? (
        <OAuthErrorAlert
          code={oauthError}
          onDismiss={() => navigate({ to: '/auth/login', search: { next }, replace: true })}
        />
      ) : null}
      <PageHeader title="Sign in to kizunu" description="Use your work email and password." />
      <LoginForm formId={FORM_ID} isPending={isPending} errorCopy={errorCopy} onSubmit={login} />
      <Button form={FORM_ID} type="submit" loading={isPending}>
        Sign in
      </Button>
      <LoginFooterLinks />
      {hasProviders ? (
        <>
          <OAuthSeparator />
          <OAuthButtons />
        </>
      ) : null}
    </div>
  )
}

function LoginFooterLinks() {
  return (
    <div className="text-muted-foreground flex flex-col gap-1 text-sm">
      <Link
        to="/auth/forgot-password"
        className="hover:text-foreground underline-offset-2 hover:underline"
      >
        Forgot password?
      </Link>
      <span>
        Need an account?{' '}
        <Link
          to="/auth/signup"
          className="hover:text-foreground underline-offset-2 hover:underline"
        >
          Sign up
        </Link>
      </span>
    </div>
  )
}
