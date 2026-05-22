import { useConfirmEmailVerification } from '@kizunu/api-client/identity/use-confirm-email-verification'
import { buttonVariants } from '@kizunu/web/components/primitives/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kizunu/web/components/primitives/card'
import { getApiErrorMessage } from '@kizunu/web/lib/get-api-error-message'
import { Link } from '@tanstack/react-router'
import { useEffect } from 'react'

const TITLES = {
  pending: 'Verifying your email…',
  success: 'Email verified',
  error: 'Verification failed',
} as const

export function VerifyEmailPanel({ token }: { token: string }) {
  const confirm = useConfirmEmailVerification()
  const { mutate } = confirm

  useEffect(() => {
    if (token) mutate({ token })
  }, [token, mutate])

  const state = !token || confirm.isError ? 'error' : confirm.isSuccess ? 'success' : 'pending'

  return (
    <Card>
      <CardHeader>
        <CardTitle>{TITLES[state]}</CardTitle>
        <CardDescription>
          {state === 'error'
            ? token
              ? getApiErrorMessage(confirm.error)
              : 'This verification link is missing its token.'
            : 'Confirming the link from your email.'}
        </CardDescription>
      </CardHeader>
      {state !== 'pending' ? (
        <CardContent>
          <Link to="/workspace" className={buttonVariants()}>
            Continue
          </Link>
        </CardContent>
      ) : null}
    </Card>
  )
}
