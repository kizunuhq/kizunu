import { useRegister } from '@kizunu/api-client/identity/use-register'
import { PageHeader } from '@kizunu/web/components/composed/page-header'
import { Button } from '@kizunu/web/components/primitives/button'
import { Field, FieldError } from '@kizunu/web/components/primitives/field'
import { LabeledInput } from '@kizunu/web/routes/auth/-components/labeled-input'
import { mapLoginError } from '@kizunu/web/routes/auth/-utils/login-error-copy'
import { Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

export function SignupForm() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const register = useRegister({ onSuccess: () => navigate({ to: '/workspace' }) })
  const errorCopy = register.isError ? mapLoginError(register.error) : null

  function submit(event: React.FormEvent) {
    event.preventDefault()
    register.mutate({ name, email, password })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Create your workspace"
        description="Register the first user for this instance."
      />
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <LabeledInput
          id="name"
          label="Name"
          type="text"
          value={name}
          autoComplete="name"
          onChange={setName}
        />
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
          autoComplete="new-password"
          onChange={setPassword}
        />
        {errorCopy ? <SignupFieldError copy={errorCopy} /> : null}
        <Button type="submit" disabled={register.isPending}>
          {register.isPending ? 'Creating…' : 'Create workspace'}
        </Button>
      </form>
      <p className="text-muted-foreground text-sm">
        Already have an account?{' '}
        <Link to="/auth/login" className="hover:text-foreground underline-offset-2 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}

interface SignupFieldErrorProps {
  copy: { message: string; actionHref?: string; actionLabel?: string }
}

function SignupFieldError({ copy }: SignupFieldErrorProps) {
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
