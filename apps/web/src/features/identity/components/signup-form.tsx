import { useRegister } from '@kizunu/api-client/identity/use-register'
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

export function SignupForm() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const register = useRegister({ onSuccess: () => navigate({ to: '/workspace' }) })

  function submit(event: React.FormEvent) {
    event.preventDefault()
    register.mutate({ name, email, password })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your workspace</CardTitle>
        <CardDescription>Register the first user for this instance.</CardDescription>
      </CardHeader>
      <CardContent>
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
          {register.isError ? <FieldError>{getApiErrorMessage(register.error)}</FieldError> : null}
          <Button type="submit" disabled={register.isPending}>
            {register.isPending ? 'Creating…' : 'Create workspace'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
