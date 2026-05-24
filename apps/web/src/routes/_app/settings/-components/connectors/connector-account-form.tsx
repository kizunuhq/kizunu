import { zodResolver } from '@hookform/resolvers/zod'
import {
  type CreateConnectorAccountRequest,
  CreateConnectorAccountRequestSchema,
} from '@kizunu/api-contracts/crm'
import { FormError } from '@kizunu/web/components/composed/form-error'
import { LookupSelect } from '@kizunu/web/components/composed/lookup-select'
import { Field, FieldError, FieldGroup, FieldLabel } from '@kizunu/web/components/primitives/field'
import { Input } from '@kizunu/web/components/primitives/input'
import { Textarea } from '@kizunu/web/components/primitives/textarea'
import { parseJsonObject } from '@kizunu/web/lib/parse-json-object'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

const CONNECTOR_OPTIONS = [{ value: 'pipedrive', label: 'Pipedrive' }]

export const connectorAccountFormSchema = CreateConnectorAccountRequestSchema.omit({
  credentials: true,
})
  .extend({ credentialsRaw: z.string() })
  .superRefine(({ credentialsRaw }, ctx) => {
    if (parseJsonObject(credentialsRaw) === null) {
      ctx.addIssue({
        code: 'custom',
        path: ['credentialsRaw'],
        message: 'Credentials must be a valid JSON object.',
      })
    }
  })

export type ConnectorAccountFormValues = z.infer<typeof connectorAccountFormSchema>

interface ConnectorAccountFormProps {
  formId: string
  isPending: boolean
  error?: string | null
  onSubmit: (values: CreateConnectorAccountRequest) => void
}

export function ConnectorAccountForm(props: ConnectorAccountFormProps) {
  const { formId, isPending, error, onSubmit } = props
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ConnectorAccountFormValues>({
    resolver: zodResolver(connectorAccountFormSchema),
    defaultValues: { connectorId: '', name: '', credentialsRaw: '{}' },
  })

  function submit(values: ConnectorAccountFormValues) {
    const credentials = parseJsonObject(values.credentialsRaw)
    if (credentials === null) return
    onSubmit({
      connectorId: values.connectorId,
      name: values.name,
      credentials,
    })
  }

  return (
    <form id={formId} className="flex flex-col gap-3" onSubmit={handleSubmit(submit)}>
      <FieldGroup>
        {error && <FormError>{error}</FormError>}
        <Controller
          control={control}
          name="connectorId"
          render={({ field, fieldState }) => (
            <Field>
              <FieldLabel>Connector</FieldLabel>
              <LookupSelect
                value={field.value ?? ''}
                placeholder="Choose a CRM connector"
                options={CONNECTOR_OPTIONS}
                onChange={field.onChange}
                disabled={isPending}
              />
              {fieldState.error && (
                <FieldError id="connectorId-error">{fieldState.error.message}</FieldError>
              )}
            </Field>
          )}
        />
        <Field>
          <FieldLabel htmlFor="connector-name">Name</FieldLabel>
          <Input
            id="connector-name"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'connector-name-error' : undefined}
            disabled={isPending}
            {...register('name')}
          />
          {errors.name && <FieldError id="connector-name-error">{errors.name.message}</FieldError>}
        </Field>
        <Field>
          <FieldLabel htmlFor="connector-credentials">Credentials (JSON)</FieldLabel>
          <Textarea
            id="connector-credentials"
            rows={4}
            aria-invalid={!!errors.credentialsRaw}
            aria-describedby={errors.credentialsRaw ? 'connector-credentials-error' : undefined}
            disabled={isPending}
            {...register('credentialsRaw')}
          />
          {errors.credentialsRaw && (
            <FieldError id="connector-credentials-error">
              {errors.credentialsRaw.message}
            </FieldError>
          )}
        </Field>
      </FieldGroup>
    </form>
  )
}
