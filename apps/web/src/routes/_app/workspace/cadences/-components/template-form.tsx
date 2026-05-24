import { zodResolver } from '@hookform/resolvers/zod'
import {
  type CreateTemplateRequest,
  CreateTemplateRequestSchema,
} from '@kizunu/api-contracts/cadence'
import { FormError } from '@kizunu/web/components/composed/form-error'
import { PluginSelect } from '@kizunu/web/components/composed/plugin-select'
import { RhfField } from '@kizunu/web/components/composed/rhf-field'
import { Field, FieldError, FieldGroup, FieldLabel } from '@kizunu/web/components/primitives/field'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

const templateFormSchema = CreateTemplateRequestSchema.omit({ variables: true })

type TemplateFormValues = z.infer<typeof templateFormSchema>

interface TemplateFormProps {
  formId: string
  isPending: boolean
  error?: string | null
  onSubmit: (values: CreateTemplateRequest) => void
}

export function TemplateForm(props: TemplateFormProps) {
  const { formId, isPending, error, onSubmit } = props
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: { name: '', channelPluginId: '', providerTemplateName: '', language: 'en_US' },
  })

  function submit(values: TemplateFormValues) {
    onSubmit({ ...values, variables: [] })
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
        <RhfField
          name="providerTemplateName"
          label="Provider template name (HSM)"
          id="provider-template"
          register={register}
          error={errors.providerTemplateName}
          disabled={isPending}
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
