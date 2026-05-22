import type {
  ConfirmPasswordReset,
  LoginRequest,
  LoginResponse,
  MeResponse,
  RegisterRequest,
  RegisterResponse,
  RequestPasswordReset,
  SwitchWorkspaceRequest,
  SwitchWorkspaceResponse,
} from '@kizunu/api-contracts/identity'
import { Routes } from '@kizunu/api-contracts/routes'

import { get, post } from '../client/api-client'

export const register = (body: RegisterRequest): Promise<RegisterResponse> =>
  post<RegisterResponse>(Routes.auth.register, body)

export const login = (body: LoginRequest): Promise<LoginResponse> =>
  post<LoginResponse>(Routes.auth.login, body)

export const logout = (): Promise<void> => post<void>(Routes.auth.logout)

export const getMe = (): Promise<MeResponse> => get<MeResponse>(Routes.auth.me)

export const switchWorkspace = (body: SwitchWorkspaceRequest): Promise<SwitchWorkspaceResponse> =>
  post<SwitchWorkspaceResponse>(Routes.auth.switchWorkspace, body)

export const requestPasswordReset = (body: RequestPasswordReset): Promise<void> =>
  post<void>(Routes.auth.passwordReset, body)

export const confirmPasswordReset = (body: ConfirmPasswordReset): Promise<void> =>
  post<void>(Routes.auth.passwordResetConfirm, body)
