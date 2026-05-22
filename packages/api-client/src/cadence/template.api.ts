import type {
  CreateTemplateRequest,
  CreateTemplateResponse,
  ListTemplatesResponse,
  UpdateTemplateRequest,
} from '@kizunu/api-contracts/cadence'
import { Routes } from '@kizunu/api-contracts/routes'

import { del, get, patch, post } from '../client/api-client'

export const createTemplate = (
  workspaceId: string,
  body: CreateTemplateRequest,
): Promise<CreateTemplateResponse> =>
  post<CreateTemplateResponse>(Routes.templates.collection(workspaceId), body)

export const listTemplates = (workspaceId: string): Promise<ListTemplatesResponse> =>
  get<ListTemplatesResponse>(Routes.templates.collection(workspaceId))

export const updateTemplate = (
  workspaceId: string,
  templateId: string,
  body: UpdateTemplateRequest,
): Promise<void> => patch<void>(Routes.templates.item(workspaceId, templateId), body)

export const deleteTemplate = (workspaceId: string, templateId: string): Promise<void> =>
  del<void>(Routes.templates.item(workspaceId, templateId))
