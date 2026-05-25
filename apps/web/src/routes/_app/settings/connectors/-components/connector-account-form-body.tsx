import { zodResolver } from '@hookform/resolvers/zod'
import type {
  ConnectorCredentialField,
  CreateConnectorAccountRequest,
} from '@kizunu/api-contracts/crm'
import { RhfField } from '@kizunu/web/components/composed/rhf-field'
import { CaretRight } from '@phosphor-icons/react'
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

interface SplitFields {
  primary: ConnectorCredentialField[]
  advanced: ConnectorCredentialField[]
}

function splitFields(fields: ConnectorCredentialField[]): SplitFields {
  const primary: ConnectorCredentialField[] = []
  const advanced: ConnectorCredentialField[] = []
  for (const field of fields) {
    if (field.required) primary.push(field)
    else advanced.push(field)
  }
  return { primary, advanced }
}

/**
 * Per-connector form. Mounted by the outer form with a `key={connectorId}`
 * so the resolver is initialized once per connector — React unmounts and
 * remounts when the operator switches connectors.
 *
 * Required credential fields render at the primary level; optional fields
 * collapse under an "Advanced settings" disclosure so the customer-facing
 * default for Pipedrive is "paste your API token, click connect".
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

  const { primary, advanced } = splitFields(fields)
  const hasAdvanced = advanced.length > 0

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
        render={({ field, fieldState }) => {
          const errorMapped = errorMap(fieldState.error)
          const currentValues = toRecord(field.value)
          return (
            <>
              <ConnectorCredentialFieldsInput
                fields={primary}
                values={currentValues}
                onChange={field.onChange}
                errors={errorMapped}
                disabled={isPending}
              />
              {hasAdvanced && (
                <details className="group border-border bg-muted/30 rounded-md border px-3 py-2 text-sm">
                  <summary className="text-foreground/80 flex cursor-pointer items-center gap-2 font-medium outline-none select-none">
                    <CaretRight
                      weight="bold"
                      className="transition-transform group-open:rotate-90"
                    />
                    Advanced settings
                  </summary>
                  <div className="mt-3 flex flex-col gap-3">
                    <ConnectorCredentialFieldsInput
                      fields={advanced}
                      values={currentValues}
                      onChange={field.onChange}
                      errors={errorMapped}
                      disabled={isPending}
                    />
                  </div>
                </details>
              )}
            </>
          )
        }}
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
