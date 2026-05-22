import { useLogin } from '@kizunu/api-client/identity/use-login'
import { Button } from '@kizunu/web/components/primitives/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kizunu/web/components/primitives/card'
import { FieldError } from '@kizunu/web/components/primitives/field'
import { LabeledInput } from '@kizunu/web/features/identity/components/labeled-input'
import { getApiErrorMessage } from '@kizunu/web/lib/get-api-error-message'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

export function LoginForm() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const login = useLogin({ onSuccess: () => navigate({ to: '/workspace' }) })

  function submit(event: React.FormEvent) {
    event.preventDefault()
    login.mutate({ email, password })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in to Kizunu</CardTitle>
        <CardDescription>Use your work email and password.</CardDescription>
      </CardHeader>
      <CardContent>
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
          {login.isError ? <FieldError>{getApiErrorMessage(login.error)}</FieldError> : null}
          <Button type="submit" disabled={login.isPending}>
            {login.isPending ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
