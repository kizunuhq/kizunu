import { z } from 'zod'

export const CreateTemplateRequestSchema = z.object({
  name: z.string().min(1).max(120),
  channelPluginId: z.string().min(1).max(100),
  providerTemplateName: z.string().min(1).max(255),
  language: z.string().min(1).max(20),
  variables: z.array(z.string()).default([]),
})

export type CreateTemplateRequest = z.infer<typeof CreateTemplateRequestSchema>

export const UpdateTemplateRequestSchema = CreateTemplateRequestSchema.partial()

export type UpdateTemplateRequest = z.infer<typeof UpdateTemplateRequestSchema>

export const CreateTemplateResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
})

export type CreateTemplateResponse = z.infer<typeof CreateTemplateResponseSchema>

export const ListTemplatesResponseSchema = z.object({
  templates: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      channelPluginId: z.string(),
      providerTemplateName: z.string(),
      language: z.string(),
      variables: z.array(z.string()),
    }),
  ),
})

export type ListTemplatesResponse = z.infer<typeof ListTemplatesResponseSchema>
