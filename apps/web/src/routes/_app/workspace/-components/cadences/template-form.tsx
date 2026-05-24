import { zodResolver } from '@hookform/resolvers/zod'
import {
  type CreateTemplateRequest,
  CreateTemplateRequestSchema,
} from '@kizunu/api-contracts/cadence'
import { FormError } from '@kizunu/web/components/composed/form-error'
import { PluginSelect } from '@kizunu/web/components/composed/plugin-select'
import { Field, FieldError, FieldGroup, FieldLabel } from '@kizunu/web/components/primitives/field'
import { Input } from '@kizunu/web/components/primitives/input'
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
        <Field>
          <FieldLabel htmlFor="template-name">Name</FieldLabel>
          <Input
            id="template-name"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'template-name-error' : undefined}
            disabled={isPending}
            {...register('name')}
          />
          {errors.name && <FieldError id="template-name-error">{errors.name.message}</FieldError>}
        </Field>
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
        <Field>
          <FieldLabel htmlFor="provider-template">Provider template name (HSM)</FieldLabel>
          <Input
            id="provider-template"
            aria-invalid={!!errors.providerTemplateName}
            aria-describedby={errors.providerTemplateName ? 'provider-template-error' : undefined}
            disabled={isPending}
            {...register('providerTemplateName')}
          />
          {errors.providerTemplateName && (
            <FieldError id="provider-template-error">
              {errors.providerTemplateName.message}
            </FieldError>
          )}
        </Field>
        <Field>
          <FieldLabel htmlFor="template-language">Language</FieldLabel>
          <Input
            id="template-language"
            aria-invalid={!!errors.language}
            aria-describedby={errors.language ? 'template-language-error' : undefined}
            disabled={isPending}
            {...register('language')}
          />
          {errors.language && (
            <FieldError id="template-language-error">{errors.language.message}</FieldError>
          )}
        </Field>
      </FieldGroup>
    </form>
  )
}
