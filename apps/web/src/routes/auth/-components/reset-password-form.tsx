import { useResetPassword } from '@kizunu/api-client/identity/use-reset-password'
import { PageHeader } from '@kizunu/web/components/composed/page-header'
import { Button, buttonVariants } from '@kizunu/web/components/primitives/button'
import { Field, FieldError } from '@kizunu/web/components/primitives/field'
import { LabeledInput } from '@kizunu/web/routes/auth/-components/labeled-input'
import { mapLoginError } from '@kizunu/web/routes/auth/-utils/login-error-copy'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'

const MIN_PASSWORD_LENGTH = 8

interface ResetPasswordFormProps {
  token: string
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const reset = useResetPassword()
  const inlineError = pickInlineError(password, confirmPassword, reset.isError, reset.error)

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (inlineError) return
    reset.resetPassword({ token, password })
  }

  if (reset.isSuccess) return <ResetPasswordSuccess />
  if (reset.isError && reset.error.code === 'identity.invalid-reset-token') {
    return <ResetPasswordInvalidLink />
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Set a new password"
        description="Choose a password at least 8 characters long."
      />
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <LabeledInput
          id="password"
          label="New password"
          type="password"
          value={password}
          autoComplete="new-password"
          onChange={setPassword}
        />
        <LabeledInput
          id="confirm-password"
          label="Confirm password"
          type="password"
          value={confirmPassword}
          autoComplete="new-password"
          onChange={setConfirmPassword}
        />
        {inlineError ? (
          <Field>
            <FieldError>{inlineError}</FieldError>
          </Field>
        ) : null}
        <Button
          type="submit"
          disabled={reset.isPending || Boolean(inlineError && password.length > 0)}
        >
          {reset.isPending ? 'Saving…' : 'Save new password'}
        </Button>
      </form>
    </div>
  )
}

function pickInlineError(
  password: string,
  confirmPassword: string,
  isError: boolean,
  error: ReturnType<typeof useResetPassword>['error'],
): string | null {
  if (password.length > 0 && password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
  }
  if (confirmPassword.length > 0 && password !== confirmPassword) {
    return "Passwords don't match."
  }
  if (isError && error && error.code !== 'identity.invalid-reset-token') {
    return mapLoginError(error)?.message ?? error.message
  }
  return null
}

function ResetPasswordSuccess() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Password updated"
        description="Sign in with your new password to continue."
      />
      <Link to="/auth/login" className={buttonVariants()}>
        Sign in
      </Link>
    </div>
  )
}

function ResetPasswordInvalidLink() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reset link expired"
        description="This reset link is invalid or has expired. Request a new one."
      />
      <Link to="/auth/forgot-password" className={buttonVariants()}>
        Request a new link
      </Link>
    </div>
  )
}
