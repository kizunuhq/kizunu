import type { Response } from 'express'

export interface SessionCookieInput {
  name: string
  secure: boolean
  token: string
  expiresAt: Date
}

/** Writes the session cookie. `sameSite: 'lax'` so it survives OAuth redirects. */
export function setSessionCookie(res: Response, input: SessionCookieInput): void {
  res.cookie(input.name, input.token, {
    httpOnly: true,
    secure: input.secure,
    sameSite: 'lax',
    expires: input.expiresAt,
    path: '/',
  })
}

export function clearSessionCookie(res: Response, name: string): void {
  res.clearCookie(name, { path: '/' })
}
