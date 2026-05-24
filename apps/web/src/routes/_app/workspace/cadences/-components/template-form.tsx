import { zodResolver } from '@hookform/resolvers/zod'
import { useDirectoryMetaTemplates } from '@kizunu/api-client/channel/use-directory-meta-templates'
import { useWorkspaceChannels } from '@kizunu/api-client/channel/use-workspace-channels'
import type { DirectoryQueryResult } from '@kizunu/api-client/directory/use-directory'
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
import {
  Controller,
  useForm,
  useWatch,
  type Control,
  type UseFormRegister,
  type FieldErrors,
} from 'react-hook-form'
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

type TemplateInputMode = 'reconnect' | 'meta-lookup' | 'plain-text'

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
  const metaTemplates = useDirectoryMetaTemplates(
    workspaceId,
    channelPluginId === 'meta-whatsapp' && metaAccount ? metaAccount.id : '',
  )
  const mode = decideMode({
    channelPluginId,
    hasMetaAccount: Boolean(metaAccount),
    needsReconnect: metaTemplates.needsReconnect,
  })

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
        <ProviderTemplateField
          mode={mode}
          control={control}
          register={register}
          errors={errors}
          isPending={isPending}
          metaTemplates={metaTemplates}
          onPickMetaTemplate={applyTemplatePick}
          onReconnect={() => navigate({ to: '/settings/channels' })}
        />
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

interface ProviderTemplateFieldProps {
  mode: TemplateInputMode
  control: Control<TemplateFormValues>
  register: UseFormRegister<TemplateFormValues>
  errors: FieldErrors<TemplateFormValues>
  isPending: boolean
  metaTemplates: DirectoryQueryResult
  onPickMetaTemplate: (name: string) => void
  onReconnect: () => void
}

function ProviderTemplateField(props: ProviderTemplateFieldProps) {
  if (props.mode === 'reconnect') {
    return <ReconnectConnectorEmptyState scope="channel" onReconnect={props.onReconnect} />
  }
  if (props.mode === 'meta-lookup') {
    const options = (props.metaTemplates.data?.items ?? []).map((row) => ({
      value: row.value,
      label: row.sublabel ? `${row.label} (${row.sublabel})` : row.label,
    }))
    return (
      <Controller
        control={props.control}
        name="providerTemplateName"
        render={({ field, fieldState }) => (
          <Field>
            <FieldLabel>Approved Meta template</FieldLabel>
            <LookupSelect
              value={field.value ?? ''}
              placeholder={
                props.metaTemplates.isPending ? 'Loading templates…' : 'Select a template'
              }
              options={options}
              onChange={props.onPickMetaTemplate}
              disabled={props.isPending || props.metaTemplates.isPending}
            />
            {fieldState.error && (
              <FieldError id="providerTemplateName-error">{fieldState.error.message}</FieldError>
            )}
          </Field>
        )}
      />
    )
  }
  return (
    <RhfField
      name="providerTemplateName"
      label="Provider template name (HSM)"
      id="provider-template"
      register={props.register}
      error={props.errors.providerTemplateName}
      disabled={props.isPending}
    />
  )
}

function decideMode(input: {
  channelPluginId: string
  hasMetaAccount: boolean
  needsReconnect: boolean
}): TemplateInputMode {
  if (input.channelPluginId !== 'meta-whatsapp' || !input.hasMetaAccount) return 'plain-text'
  return input.needsReconnect ? 'reconnect' : 'meta-lookup'
}
