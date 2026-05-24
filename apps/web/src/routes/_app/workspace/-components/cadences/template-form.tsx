import { useCreateTemplate } from '@kizunu/api-client/cadence/use-create-template'
import { PluginSelect } from '@kizunu/web/components/composed/plugin-select'
import { Button } from '@kizunu/web/components/primitives/button'
import { Field, FieldLabel } from '@kizunu/web/components/primitives/field'
import { Input } from '@kizunu/web/components/primitives/input'
import { useState } from 'react'

export function TemplateForm({ workspaceId }: { workspaceId: string }) {
  const [name, setName] = useState('')
  const [channelPluginId, setChannelPluginId] = useState('')
  const [providerTemplateName, setProviderTemplateName] = useState('')
  const [language, setLanguage] = useState('en_US')
  const create = useCreateTemplate(workspaceId, { onSuccess: () => setName('') })

  function submit(event: React.FormEvent) {
    event.preventDefault()
    create.mutate({ name, channelPluginId, providerTemplateName, language, variables: [] })
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={submit}>
      <Field>
        <FieldLabel htmlFor="template-name">Name</FieldLabel>
        <Input id="template-name" value={name} required onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field>
        <FieldLabel>Channel plugin</FieldLabel>
        <PluginSelect value={channelPluginId} onChange={setChannelPluginId} />
      </Field>
      <Field>
        <FieldLabel htmlFor="provider-template">Provider template name (HSM)</FieldLabel>
        <Input
          id="provider-template"
          value={providerTemplateName}
          required
          onChange={(e) => setProviderTemplateName(e.target.value)}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="template-language">Language</FieldLabel>
        <Input
          id="template-language"
          value={language}
          required
          onChange={(e) => setLanguage(e.target.value)}
        />
      </Field>
      <Button type="submit" disabled={create.isPending || !channelPluginId}>
        Add template
      </Button>
    </form>
  )
}
