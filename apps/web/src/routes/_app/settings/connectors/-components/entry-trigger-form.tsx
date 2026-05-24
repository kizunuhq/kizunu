import { zodResolver } from '@hookform/resolvers/zod'
import { useCadences } from '@kizunu/api-client/cadence/use-cadences'
import { useDirectoryPipedrivePipelines } from '@kizunu/api-client/crm/use-directory-pipedrive-pipelines'
import { useDirectoryPipedriveStages } from '@kizunu/api-client/crm/use-directory-pipedrive-stages'
import { useWorkspaceConnectors } from '@kizunu/api-client/crm/use-workspace-connectors'
import {
  type CreateEntryTriggerRequest,
  CreateEntryTriggerRequestSchema,
} from '@kizunu/api-contracts/engine'
import { FormError } from '@kizunu/web/components/composed/form-error'
import { LookupSelect } from '@kizunu/web/components/composed/lookup-select'
import { ReconnectConnectorEmptyState } from '@kizunu/web/components/composed/reconnect-connector-empty-state'
import { Field, FieldError, FieldGroup, FieldLabel } from '@kizunu/web/components/primitives/field'
import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'

const entryTriggerFormSchema = CreateEntryTriggerRequestSchema.extend({
  pipelineId: z.string().min(1),
})

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
  const navigate = useNavigate()
  const connectors = useWorkspaceConnectors(workspaceId)
  const cadences = useCadences(workspaceId)
  const { handleSubmit, control, setValue } = useForm<EntryTriggerFormValues>({
    resolver: zodResolver(entryTriggerFormSchema),
    defaultValues: { connectorAccountId: '', cadenceId: '', stageId: '', pipelineId: '' },
  })

  const connectorAccountId = useWatch({ control, name: 'connectorAccountId' })
  const pipelineId = useWatch({ control, name: 'pipelineId' })

  const pipelines = useDirectoryPipedrivePipelines(workspaceId, connectorAccountId)
  const stages = useDirectoryPipedriveStages(workspaceId, connectorAccountId, pipelineId)

  useEffect(() => {
    setValue('pipelineId', '', { shouldValidate: false })
    setValue('stageId', '', { shouldValidate: false })
  }, [connectorAccountId, setValue])

  useEffect(() => {
    setValue('stageId', '', { shouldValidate: false })
  }, [pipelineId, setValue])

  const connectorOptions = (connectors.data?.accounts ?? []).map((a) => ({
    value: a.id,
    label: a.name,
  }))
  const cadenceOptions = (cadences.data?.cadences ?? []).map((c) => ({
    value: c.id,
    label: c.name,
  }))
  const pipelineOptions = (pipelines.data?.items ?? []).map((row) => ({
    value: row.value,
    label: row.label,
  }))
  const stageOptions = (stages.data?.items ?? []).map((row) => ({
    value: row.value,
    label: row.label,
  }))

  const showReconnect = pipelines.needsReconnect || stages.needsReconnect

  return (
    <form id={formId} className="flex flex-col gap-3" onSubmit={handleSubmit(onSubmit)}>
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
        {showReconnect ? (
          <ReconnectConnectorEmptyState
            scope="crm"
            onReconnect={() => navigate({ to: '/settings/connectors' })}
          />
        ) : (
          <>
            <Controller
              control={control}
              name="pipelineId"
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel>Pipeline</FieldLabel>
                  <LookupSelect
                    value={field.value ?? ''}
                    placeholder={
                      connectorAccountId ? 'Select a pipeline' : 'Pick a connector first'
                    }
                    options={pipelineOptions}
                    onChange={field.onChange}
                    disabled={isPending || !connectorAccountId || pipelines.isPending}
                  />
                  {fieldState.error && (
                    <FieldError id="pipelineId-error">{fieldState.error.message}</FieldError>
                  )}
                </Field>
              )}
            />
            <Controller
              control={control}
              name="stageId"
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel>Stage</FieldLabel>
                  <LookupSelect
                    value={field.value ?? ''}
                    placeholder={pipelineId ? 'Select a stage' : 'Pick a pipeline first'}
                    options={stageOptions}
                    onChange={field.onChange}
                    disabled={isPending || !pipelineId || stages.isPending}
                  />
                  {fieldState.error && (
                    <FieldError id="stageId-error">{fieldState.error.message}</FieldError>
                  )}
                </Field>
              )}
            />
          </>
        )}
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
