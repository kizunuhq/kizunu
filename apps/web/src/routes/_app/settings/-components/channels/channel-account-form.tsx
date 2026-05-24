import { zodResolver } from '@hookform/resolvers/zod'
import { useChannelPlugins } from '@kizunu/api-client/channel/use-channel-plugins'
import {
  type CreateChannelAccountRequest,
  CreateChannelAccountRequestSchema,
} from '@kizunu/api-contracts/channel'
import { FormError } from '@kizunu/web/components/composed/form-error'
import { PluginSelect } from '@kizunu/web/components/composed/plugin-select'
import { Field, FieldError, FieldGroup, FieldLabel } from '@kizunu/web/components/primitives/field'
import { Input } from '@kizunu/web/components/primitives/input'
import { CredentialFieldsInput } from '@kizunu/web/routes/_app/settings/-components/channels/credential-fields-input'
import { hasRequiredCredentials } from '@kizunu/web/routes/_app/settings/-utils/has-required-credentials'
import { userInputFields } from '@kizunu/web/routes/_app/settings/-utils/user-input-fields'
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
        <Field>
          <FieldLabel htmlFor="channel-name">Name</FieldLabel>
          <Input
            id="channel-name"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'channel-name-error' : undefined}
            disabled={isPending}
            {...register('name')}
          />
          {errors.name && <FieldError id="channel-name-error">{errors.name.message}</FieldError>}
        </Field>
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
