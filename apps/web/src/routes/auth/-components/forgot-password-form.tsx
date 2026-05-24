import { useRequestPasswordReset } from '@kizunu/api-client/identity/use-request-password-reset'
import { PageHeader } from '@kizunu/web/components/composed/page-header'
import { buttonVariants, Button } from '@kizunu/web/components/primitives/button'
import { Field, FieldError } from '@kizunu/web/components/primitives/field'
import { LabeledInput } from '@kizunu/web/routes/auth/-components/labeled-input'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const request = useRequestPasswordReset()

  function submit(event: React.FormEvent) {
    event.preventDefault()
    request.mutate({ email })
  }

  if (request.isSuccess) return <ForgotPasswordSuccess />

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reset your password"
        description="Enter the email on your account; we'll send a link if it's on file."
      />
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <LabeledInput
          id="email"
          label="Email"
          type="email"
          value={email}
          autoComplete="email"
          onChange={setEmail}
        />
        {request.isError ? (
          <Field>
            <FieldError>We couldn't send the reset email. Try again in a moment.</FieldError>
          </Field>
        ) : null}
        <Button type="submit" disabled={request.isPending}>
          {request.isPending ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
      <p className="text-muted-foreground text-sm">
        Remembered it?{' '}
        <Link to="/auth/login" className="hover:text-foreground underline-offset-2 hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  )
}

function ForgotPasswordSuccess() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Check your inbox"
        description="If that email is on file, we sent a reset link. The link expires in one hour."
      />
      <Link to="/auth/login" className={buttonVariants({ variant: 'outline' })}>
        Back to sign in
      </Link>
    </div>
  )
}
