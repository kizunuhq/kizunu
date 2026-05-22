import type {
  CadenceRequest,
  CadenceResponse,
  CreateCadenceResponse,
  ListCadencesResponse,
} from '@kizunu/api-contracts/cadence'
import { Routes } from '@kizunu/api-contracts/routes'

import { del, get, patch, post } from '../client/api-client'

export const createCadence = (
  workspaceId: string,
  body: CadenceRequest,
): Promise<CreateCadenceResponse> =>
  post<CreateCadenceResponse>(Routes.cadences.collection(workspaceId), body)

export const listCadences = (workspaceId: string): Promise<ListCadencesResponse> =>
  get<ListCadencesResponse>(Routes.cadences.collection(workspaceId))

export const getCadence = (workspaceId: string, cadenceId: string): Promise<CadenceResponse> =>
  get<CadenceResponse>(Routes.cadences.item(workspaceId, cadenceId))

export const updateCadence = (
  workspaceId: string,
  cadenceId: string,
  body: CadenceRequest,
): Promise<void> => patch<void>(Routes.cadences.item(workspaceId, cadenceId), body)

export const deleteCadence = (workspaceId: string, cadenceId: string): Promise<void> =>
  del<void>(Routes.cadences.item(workspaceId, cadenceId))
