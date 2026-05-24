import { zodResolver } from '@hookform/resolvers/zod'
import { useDirectoryMetaTemplates } from '@kizunu/api-client/channel/use-directory-meta-templates'
import { useWorkspaceChannels } from '@kizunu/api-client/channel/use-workspace-channels'
import {
  type CreateTemplateRequest,
  CreateTemplateRequestSchema,
} from '@kizunu/api-contracts/cadence'
import { FormError } from '@kizunu/web/components/composed/form-error'
import { LookupSelect } from '@kizunu/web/components/composed/lookup-select'
import { PluginSelect } from '@kizunu/web/components/composed/plugin-select'
import { ReconnectConnectorEmptyState } from '@kizunu/web/components/composed/reconnect-connector-empty-state'
import { RhfField } from '@kizunu/web/components/composed/rhf-field'
import { Field, FieldError, FieldGroup, FieldLabel } from '@kizunu/web/components/primitives/field'
import { useNavigate } from '@tanstack/react-router'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'

const templateFormSchema = CreateTemplateRequestSchema.omit({ variables: true })

type TemplateFormValues = z.infer<typeof templateFormSchema>

interface TemplateFormProps {
  formId: string
  workspaceId: string
  isPending: boolean
  error?: string | null
  onSubmit: (values: CreateTemplateRequest) => void
}

export function TemplateForm(props: TemplateFormProps) {
  const { formId, workspaceId, isPending, error, onSubmit } = props
  const navigate = useNavigate()
  const channels = useWorkspaceChannels(workspaceId)
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: { name: '', channelPluginId: '', providerTemplateName: '', language: 'en_US' },
  })

  const channelPluginId = useWatch({ control, name: 'channelPluginId' })

  const metaAccount = (channels.data?.accounts ?? []).find(
    (account) => account.pluginId === 'meta-whatsapp',
  )
  const isMetaPlugin = channelPluginId === 'meta-whatsapp'
  const metaTemplates = useDirectoryMetaTemplates(
    workspaceId,
    isMetaPlugin && metaAccount ? metaAccount.id : '',
  )

  function submit(values: TemplateFormValues) {
    onSubmit({ ...values, variables: [] })
  }

  function applyTemplatePick(name: string) {
    const picked = (metaTemplates.data?.items ?? []).find((row) => row.value === name)
    setValue('providerTemplateName', name, { shouldValidate: true })
    const sublabel = picked?.sublabel
    if (sublabel) {
      const [language] = sublabel.split(' · ')
      if (language) setValue('language', language, { shouldValidate: true })
    }
  }

  const templateOptions = (metaTemplates.data?.items ?? []).map((row) => ({
    value: row.value,
    label: row.sublabel ? `${row.label} (${row.sublabel})` : row.label,
  }))

  return (
    <form id={formId} className="flex flex-col gap-3" onSubmit={handleSubmit(submit)}>
      <FieldGroup>
        {error && <FormError>{error}</FormError>}
        <RhfField
          name="name"
          label="Name"
          id="template-name"
          register={register}
          error={errors.name}
          disabled={isPending}
        />
        <Controller
          control={control}
          name="channelPluginId"
          render={({ field, fieldState }) => (
            <Field>
              <FieldLabel>Channel plugin</FieldLabel>
              <PluginSelect value={field.value ?? ''} onChange={field.onChange} />
              {fieldState.error && (
                <FieldError id="channelPluginId-error">{fieldState.error.message}</FieldError>
              )}
            </Field>
          )}
        />
        {isMetaPlugin && metaAccount && metaTemplates.needsReconnect ? (
          <ReconnectConnectorEmptyState
            scope="channel"
            onReconnect={() => navigate({ to: '/settings/channels' })}
          />
        ) : isMetaPlugin && metaAccount ? (
          <Controller
            control={control}
            name="providerTemplateName"
            render={({ field, fieldState }) => (
              <Field>
                <FieldLabel>Approved Meta template</FieldLabel>
                <LookupSelect
                  value={field.value ?? ''}
                  placeholder={metaTemplates.isPending ? 'Loading templates…' : 'Select a template'}
                  options={templateOptions}
                  onChange={applyTemplatePick}
                  disabled={isPending || metaTemplates.isPending}
                />
                {fieldState.error && (
                  <FieldError id="providerTemplateName-error">
                    {fieldState.error.message}
                  </FieldError>
                )}
              </Field>
            )}
          />
        ) : (
          <RhfField
            name="providerTemplateName"
            label="Provider template name (HSM)"
            id="provider-template"
            register={register}
            error={errors.providerTemplateName}
            disabled={isPending}
          />
        )}
        <RhfField
          name="language"
          label="Language"
          id="template-language"
          register={register}
          error={errors.language}
          disabled={isPending}
        />
      </FieldGroup>
    </form>
  )
}
