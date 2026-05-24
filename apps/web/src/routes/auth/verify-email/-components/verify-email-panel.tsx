import { useConfirmEmailVerification } from '@kizunu/api-client/identity/use-confirm-email-verification'
import { PageHeader } from '@kizunu/web/components/composed/page-header'
import { buttonVariants } from '@kizunu/web/components/primitives/button'
import { getApiErrorMessage } from '@kizunu/web/lib/get-api-error-message'
import { Link } from '@tanstack/react-router'
import { useEffect } from 'react'

const TITLES = {
  pending: 'Verifying your email',
  success: 'Email verified',
  error: 'Verification failed',
} as const

export function VerifyEmailPanel({ token }: { token: string }) {
  const confirm = useConfirmEmailVerification()
  const { confirmEmailVerification } = confirm

  useEffect(() => {
    if (token) confirmEmailVerification({ token })
  }, [token, confirmEmailVerification])

  const state = !token || confirm.isError ? 'error' : confirm.isSuccess ? 'success' : 'pending'

  const descriptions = {
    pending: 'Confirming the link from your email.',
    success: 'Your email address is now confirmed.',
    error: token
      ? getApiErrorMessage(confirm.error)
      : 'This verification link is missing its token.',
  } as const

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={TITLES[state]} description={descriptions[state]} />
      {state === 'success' ? (
        <Link to="/workspace" className={buttonVariants()}>
          Continue
        </Link>
      ) : null}
      {state === 'error' ? (
        <Link to="/auth/forgot-password" className={buttonVariants({ variant: 'outline' })}>
          Request a new link
        </Link>
      ) : null}
    </div>
  )
}
