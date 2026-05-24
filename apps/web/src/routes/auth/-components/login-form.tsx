import { useLogin } from '@kizunu/api-client/identity/use-login'
import { PageHeader } from '@kizunu/web/components/composed/page-header'
import { Button } from '@kizunu/web/components/primitives/button'
import { Field, FieldError } from '@kizunu/web/components/primitives/field'
import { LabeledInput } from '@kizunu/web/routes/auth/-components/labeled-input'
import { mapLoginError } from '@kizunu/web/routes/auth/-utils/login-error-copy'
import { Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

export function LoginForm() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { login, isPending, isError, error } = useLogin({
    onSuccess: () => navigate({ to: '/workspace' }),
  })
  const errorCopy = isError ? mapLoginError(error) : null

  function submit(event: React.FormEvent) {
    event.preventDefault()
    login({ email, password })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Sign in to kizunu" description="Use your work email and password." />
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <LabeledInput
          id="email"
          label="Email"
          type="email"
          value={email}
          autoComplete="email"
          onChange={setEmail}
        />
        <LabeledInput
          id="password"
          label="Password"
          type="password"
          value={password}
          autoComplete="current-password"
          onChange={setPassword}
        />
        {errorCopy ? <LoginFieldError copy={errorCopy} /> : null}
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
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
    </div>
  )
}

interface LoginFieldErrorProps {
  copy: { message: string; actionHref?: string; actionLabel?: string }
}

function LoginFieldError({ copy }: LoginFieldErrorProps) {
  return (
    <Field>
      <FieldError>
        {copy.message}
        {copy.actionHref && copy.actionLabel ? (
          <>
            {' '}
            <Link
              to={copy.actionHref}
              className="text-destructive hover:text-destructive underline underline-offset-2"
            >
              {copy.actionLabel}
            </Link>
          </>
        ) : null}
      </FieldError>
    </Field>
  )
}
