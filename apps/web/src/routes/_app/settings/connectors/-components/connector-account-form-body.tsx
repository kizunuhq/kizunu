import { zodResolver } from '@hookform/resolvers/zod'
import type {
  ConnectorCredentialField,
  CreateConnectorAccountRequest,
} from '@kizunu/api-contracts/crm'
import { RhfField } from '@kizunu/web/components/composed/rhf-field'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

import { getConnectorCredentialsSchema } from '../-utils/connector-client-schemas'
import { ConnectorCredentialFieldsInput } from './connector-credential-fields-input'

interface ConnectorAccountFormBodyProps {
  formId: string
  connectorId: string
  fields: ConnectorCredentialField[]
  isPending: boolean
  onSubmit: (values: CreateConnectorAccountRequest) => void
}

/**
 * Per-connector form. Mounted by the outer form with a `key={connectorId}`
 * so the resolver is initialized once per connector — React unmounts and
 * remounts when the operator switches connectors.
 */
export function ConnectorAccountFormBody(props: ConnectorAccountFormBodyProps) {
  const { formId, connectorId, fields, isPending, onSubmit } = props
  const schema = z.object({
    name: z.string().min(1, 'Name is required').max(120),
    credentials: getConnectorCredentialsSchema(connectorId),
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
        onSubmit({ connectorId, name: values.name, credentials: toRecord(values.credentials) }),
      )}
    >
      <RhfField
        name="name"
        label="Name"
        id="connector-name"
        register={register}
        error={errors.name}
        disabled={isPending}
      />
      <Controller
        control={control}
        name="credentials"
        render={({ field, fieldState }) => (
          <ConnectorCredentialFieldsInput
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
