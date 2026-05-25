import { zodResolver } from '@hookform/resolvers/zod'
import { useChannelPlugins } from '@kizunu/api-client/channel/use-channel-plugins'
import { FormError } from '@kizunu/web/components/composed/form-error'
import { PluginSelect } from '@kizunu/web/components/composed/plugin-select'
import { RhfField } from '@kizunu/web/components/composed/rhf-field'
import { Field, FieldError, FieldGroup, FieldLabel } from '@kizunu/web/components/primitives/field'
import { CredentialFieldsInput } from '@kizunu/web/routes/_app/settings/channels/-components/credential-fields-input'
import { getCredentialsSchema } from '@kizunu/web/routes/_app/settings/channels/-utils/plugin-client-schemas'
import { userInputFields } from '@kizunu/web/routes/_app/settings/channels/-utils/user-input-fields'
import { Controller, useForm, type Resolver } from 'react-hook-form'
import { z, type ZodType } from 'zod'

interface ChannelAccountFormValues {
  pluginId: string
  name: string
  credentials: Record<string, unknown>
}

interface ChannelAccountFormProps {
  formId: string
  isPending: boolean
  error?: string | null
  onSubmit: (values: ChannelAccountFormValues) => void
}

const baseSchema = z.object({
  pluginId: z.string().min(1, 'Pick a plugin'),
  name: z.string().min(1, 'Name is required').max(120),
})

function buildResolver(): Resolver<ChannelAccountFormValues> {
  return async (values, context, options) => {
    const credentialsSchema = pickCredentialsSchema(values.pluginId)
    const schema = baseSchema.extend({ credentials: credentialsSchema })
    // Resolver<ChannelAccountFormValues>.credentials is Record<string, unknown>;
    // the per-plugin schema narrows it (e.g. MetaCredentialsClientInput). The
    // cast is the bridge between the form's open-record state shape and the
    // schema-specific output shape — they're structurally compatible.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    const resolver = zodResolver(schema) as unknown as Resolver<ChannelAccountFormValues>
    return resolver(values, context, options)
  }
}

function pickCredentialsSchema(pluginId: string | undefined): ZodType {
  if (!pluginId) return z.record(z.string(), z.unknown())
  return getCredentialsSchema(pluginId)
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
    clearErrors,
    formState: { errors },
  } = useForm<ChannelAccountFormValues>({
    resolver: buildResolver(),
    defaultValues: { pluginId: '', name: '', credentials: {} },
  })

  const pluginId = watch('pluginId')
  const fields = userInputFields(
    plugins.data?.plugins.find((plugin) => plugin.id === pluginId)?.credentialFields ?? [],
  )
  const credentialErrors = extractCredentialErrors(errors.credentials)

  return (
    <form
      id={formId}
      className="flex flex-col gap-3"
      onSubmit={handleSubmit((values) => onSubmit(values))}
    >
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
              errors={credentialErrors}
              disabled={isPending}
            />
          )}
        />
      </FieldGroup>
    </form>
  )
}

function extractCredentialErrors(raw: unknown): Partial<Record<string, string>> | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(raw)) {
    const message = readMessage(value)
    if (message !== undefined) result[key] = message
  }
  return Object.keys(result).length > 0 ? result : undefined
}

function readMessage(value: unknown): string | undefined {
  if (!value || typeof value !== 'object' || !('message' in value)) return undefined
  const message = (value as Readonly<{ message: unknown }>).message
  return typeof message === 'string' ? message : undefined
}
