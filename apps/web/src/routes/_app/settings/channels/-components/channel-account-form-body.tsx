import { zodResolver } from '@hookform/resolvers/zod'
import type { ChannelCredentialField } from '@kizunu/api-contracts/channel'
import { RhfField } from '@kizunu/web/components/composed/rhf-field'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

import { getCredentialsSchema } from '../-utils/plugin-client-schemas'
import type { ChannelAccountFormValues } from './channel-account-form'
import { CredentialFieldsInput } from './credential-fields-input'

interface ChannelAccountFormBodyProps {
  formId: string
  pluginId: string
  fields: ChannelCredentialField[]
  isPending: boolean
  onSubmit: (values: ChannelAccountFormValues) => void
}

/**
 * Per-plugin form. Mounted by the outer ChannelAccountForm with a
 * `key={pluginId}` so the resolver is initialized once per plugin — when the
 * operator switches, React unmounts this and remounts with the new pluginId
 * and schema. No dynamic resolver gymnastics required.
 */
export function ChannelAccountFormBody(props: ChannelAccountFormBodyProps) {
  const { formId, pluginId, fields, isPending, onSubmit } = props
  const schema = z.object({
    name: z.string().min(1, 'Name is required').max(120),
    credentials: getCredentialsSchema(pluginId),
  })

  type Values = z.infer<typeof schema>

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', credentials: {} },
  })

  return (
    <form
      id={formId}
      className="flex flex-col gap-3"
      onSubmit={handleSubmit((values) =>
        onSubmit({
          pluginId,
          name: values.name,
          credentials: toRecord(values.credentials),
        }),
      )}
    >
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
        render={({ field, fieldState }) => (
          <CredentialFieldsInput
            fields={fields}
            values={toRecord(field.value)}
            onChange={field.onChange}
            errors={errorMap(fieldState.error)}
            disabled={isPending}
          />
        )}
      />
    </form>
  )
}

function toRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return { ...value }
  }
  return {}
}

function errorMap(error: unknown): Record<string, string> | undefined {
  if (!error || typeof error !== 'object') return undefined
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(error)) {
    const message = readMessage(value)
    if (message !== undefined) out[key] = message
  }
  return Object.keys(out).length > 0 ? out : undefined
}

function readMessage(value: unknown): string | undefined {
  if (!value || typeof value !== 'object' || !('message' in value)) return undefined
  const message = (value as Readonly<{ message: unknown }>).message
  return typeof message === 'string' ? message : undefined
}
