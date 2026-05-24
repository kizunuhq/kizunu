import { zodResolver } from '@hookform/resolvers/zod'
import { useChannelPlugins } from '@kizunu/api-client/channel/use-channel-plugins'
import {
  type CreateChannelAccountRequest,
  CreateChannelAccountRequestSchema,
} from '@kizunu/api-contracts/channel'
import { FormError } from '@kizunu/web/components/composed/form-error'
import { PluginSelect } from '@kizunu/web/components/composed/plugin-select'
import { RhfField } from '@kizunu/web/components/composed/rhf-field'
import { Field, FieldError, FieldGroup, FieldLabel } from '@kizunu/web/components/primitives/field'
import { CredentialFieldsInput } from '@kizunu/web/routes/_app/settings/channels/-components/credential-fields-input'
import { hasRequiredCredentials } from '@kizunu/web/routes/_app/settings/channels/-utils/has-required-credentials'
import { userInputFields } from '@kizunu/web/routes/_app/settings/channels/-utils/user-input-fields'
import { Controller, useForm } from 'react-hook-form'

interface ChannelAccountFormProps {
  formId: string
  isPending: boolean
  error?: string | null
  onSubmit: (values: CreateChannelAccountRequest) => void
}

export function ChannelAccountForm(props: ChannelAccountFormProps) {
  const { formId, isPending, error, onSubmit } = props
  const plugins = useChannelPlugins()
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<CreateChannelAccountRequest>({
    resolver: zodResolver(CreateChannelAccountRequestSchema),
    defaultValues: { pluginId: '', name: '', credentials: {} },
  })

  const pluginId = watch('pluginId')
  const fields = userInputFields(
    plugins.data?.plugins.find((plugin) => plugin.id === pluginId)?.credentialFields ?? [],
  )

  // Why: the required-credential list depends on the picked plugin, which loads
  // async. RHF's useForm captures the resolver at mount, so a useMemo'd schema
  // wouldn't re-resolve on plugin change. Runs after zod succeeds.
  function submit(values: CreateChannelAccountRequest) {
    if (!hasRequiredCredentials(fields, values.credentials ?? {})) {
      setError('credentials', {
        type: 'required',
        message: 'Fill every required credential field.',
      })
      return
    }
    clearErrors('credentials')
    onSubmit(values)
  }

  return (
    <form id={formId} className="flex flex-col gap-3" onSubmit={handleSubmit(submit)}>
      <FieldGroup>
        {error && <FormError>{error}</FormError>}
        <Controller
          control={control}
          name="pluginId"
          render={({ field, fieldState }) => (
            <Field>
              <FieldLabel>Plugin</FieldLabel>
              <PluginSelect
                value={field.value ?? ''}
                onChange={(next) => {
                  field.onChange(next)
                  setValue('credentials', {})
                  clearErrors('credentials')
                }}
              />
              {fieldState.error && (
                <FieldError id="pluginId-error">{fieldState.error.message}</FieldError>
              )}
            </Field>
          )}
        />
        <RhfField
          name="name"
          label="Name"
          id="channel-name"
          register={register}
          error={errors.name}
          disabled={isPending}
        />
        <Controller
          control={control}
          name="credentials"
          render={({ field }) => (
            <CredentialFieldsInput
              fields={fields}
              values={field.value ?? {}}
              onChange={field.onChange}
            />
          )}
        />
        {errors.credentials && (
          <FieldError id="credentials-error">
            {(errors.credentials as { message?: string }).message ??
              'Fill every required credential field.'}
          </FieldError>
        )}
      </FieldGroup>
    </form>
  )
}
