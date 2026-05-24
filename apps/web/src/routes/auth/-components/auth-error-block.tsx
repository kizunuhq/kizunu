import { FormError } from '@kizunu/web/components/composed/form-error'
import type { LoginErrorCopy } from '@kizunu/web/routes/auth/-utils/login-error-copy'
import { Link } from '@tanstack/react-router'

interface AuthErrorBlockProps {
  copy: LoginErrorCopy
}

export function AuthErrorBlock({ copy }: AuthErrorBlockProps) {
  return (
    <FormError>
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
    </FormError>
  )
}
