import { FormError } from '@kizunu/web/components/composed/form-error'
import { PluginSelect } from '@kizunu/web/components/composed/plugin-select'
import { Field, FieldLabel } from '@kizunu/web/components/primitives/field'
import { Input } from '@kizunu/web/components/primitives/input'
import { useState } from 'react'

export interface TemplateFormValues {
  name: string
  channelPluginId: string
  providerTemplateName: string
  language: string
  variables: never[]
}

interface TemplateFormProps {
  formId: string
  isPending: boolean
  error?: string | null
  onSubmit: (values: TemplateFormValues) => void
}

export function TemplateForm(props: TemplateFormProps) {
  const { formId, isPending, error, onSubmit } = props
  const [name, setName] = useState('')
  const [channelPluginId, setChannelPluginId] = useState('')
  const [providerTemplateName, setProviderTemplateName] = useState('')
  const [language, setLanguage] = useState('en_US')
  const [validationError, setValidationError] = useState<string | null>(null)

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!channelPluginId) {
      setValidationError('Pick a channel plugin.')
      return
    }
    setValidationError(null)
    onSubmit({ name, channelPluginId, providerTemplateName, language, variables: [] })
  }

  const displayError = validationError ?? error

  return (
    <form id={formId} className="flex flex-col gap-3" onSubmit={submit}>
      {displayError && <FormError>{displayError}</FormError>}
      <Field>
        <FieldLabel htmlFor="template-name">Name</FieldLabel>
        <Input
          id="template-name"
          value={name}
          required
          disabled={isPending}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      <Field>
        <FieldLabel>Channel plugin</FieldLabel>
        <PluginSelect
          value={channelPluginId}
          onChange={(next) => {
            setChannelPluginId(next)
            setValidationError(null)
          }}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="provider-template">Provider template name (HSM)</FieldLabel>
        <Input
          id="provider-template"
          value={providerTemplateName}
          required
          disabled={isPending}
          onChange={(e) => setProviderTemplateName(e.target.value)}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="template-language">Language</FieldLabel>
        <Input
          id="template-language"
          value={language}
          required
          disabled={isPending}
          onChange={(e) => setLanguage(e.target.value)}
        />
      </Field>
    </form>
  )
}
