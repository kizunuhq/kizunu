import { FormError } from '@kizunu/web/components/composed/form-error'
import { Field, FieldLabel } from '@kizunu/web/components/primitives/field'
import { Input } from '@kizunu/web/components/primitives/input'
import { useState } from 'react'

export interface InviteMemberFormValues {
  email: string
}

interface InviteMemberFormProps {
  formId: string
  isPending: boolean
  error?: string | null
  onSubmit: (values: InviteMemberFormValues) => void
}

export function InviteMemberForm(props: InviteMemberFormProps) {
  const { formId, isPending, error, onSubmit } = props
  const [email, setEmail] = useState('')

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!email) return
    onSubmit({ email })
  }

  return (
    <form id={formId} className="flex flex-col gap-3" onSubmit={submit}>
      {error && <FormError>{error}</FormError>}
      <Field>
        <FieldLabel htmlFor="invite-email">Email</FieldLabel>
        <Input
          id="invite-email"
          type="email"
          value={email}
          placeholder="teammate@company.com"
          required
          disabled={isPending}
          onChange={(event) => setEmail(event.target.value)}
        />
      </Field>
    </form>
  )
}
