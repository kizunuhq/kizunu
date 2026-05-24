import { zodResolver } from '@hookform/resolvers/zod'
import { useCadences } from '@kizunu/api-client/cadence/use-cadences'
import { useWorkspaceConnectors } from '@kizunu/api-client/crm/use-workspace-connectors'
import {
  type CreateEntryTriggerRequest,
  CreateEntryTriggerRequestSchema,
} from '@kizunu/api-contracts/engine'
import { FormError } from '@kizunu/web/components/composed/form-error'
import { LookupSelect } from '@kizunu/web/components/composed/lookup-select'
import { Field, FieldError, FieldGroup, FieldLabel } from '@kizunu/web/components/primitives/field'
import { Input } from '@kizunu/web/components/primitives/input'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

const entryTriggerFormSchema = CreateEntryTriggerRequestSchema.omit({ pipelineId: true })

type EntryTriggerFormValues = z.infer<typeof entryTriggerFormSchema>

interface EntryTriggerFormProps {
  formId: string
  workspaceId: string
  isPending: boolean
  error?: string | null
  onSubmit: (values: CreateEntryTriggerRequest) => void
}

export function EntryTriggerForm(props: EntryTriggerFormProps) {
  const { formId, workspaceId, isPending, error, onSubmit } = props
  const connectors = useWorkspaceConnectors(workspaceId)
  const cadences = useCadences(workspaceId)
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<EntryTriggerFormValues>({
    resolver: zodResolver(entryTriggerFormSchema),
    defaultValues: { connectorAccountId: '', cadenceId: '', stageId: '' },
  })

  function submit(values: EntryTriggerFormValues) {
    onSubmit({ ...values, pipelineId: null })
  }

  const connectorOptions = (connectors.data?.accounts ?? []).map((a) => ({
    value: a.id,
    label: a.name,
  }))
  const cadenceOptions = (cadences.data?.cadences ?? []).map((c) => ({
    value: c.id,
    label: c.name,
  }))

  return (
    <form id={formId} className="flex flex-col gap-3" onSubmit={handleSubmit(submit)}>
      <FieldGroup>
        {error && <FormError>{error}</FormError>}
        <Controller
          control={control}
          name="connectorAccountId"
          render={({ field, fieldState }) => (
            <Field>
              <FieldLabel>Connector account</FieldLabel>
              <LookupSelect
                value={field.value ?? ''}
                placeholder="Select connector"
                options={connectorOptions}
                onChange={field.onChange}
                disabled={isPending}
              />
              {fieldState.error && (
                <FieldError id="connectorAccountId-error">{fieldState.error.message}</FieldError>
              )}
            </Field>
          )}
        />
        <Field>
          <FieldLabel htmlFor="stage-id">CRM stage id</FieldLabel>
          <Input
            id="stage-id"
            aria-invalid={!!errors.stageId}
            aria-describedby={errors.stageId ? 'stage-id-error' : undefined}
            disabled={isPending}
            {...register('stageId')}
          />
          {errors.stageId && <FieldError id="stage-id-error">{errors.stageId.message}</FieldError>}
        </Field>
        <Controller
          control={control}
          name="cadenceId"
          render={({ field, fieldState }) => (
            <Field>
              <FieldLabel>Cadence</FieldLabel>
              <LookupSelect
                value={field.value ?? ''}
                placeholder="Select cadence"
                options={cadenceOptions}
                onChange={field.onChange}
                disabled={isPending}
              />
              {fieldState.error && (
                <FieldError id="cadenceId-error">{fieldState.error.message}</FieldError>
              )}
            </Field>
          )}
        />
      </FieldGroup>
    </form>
  )
}
