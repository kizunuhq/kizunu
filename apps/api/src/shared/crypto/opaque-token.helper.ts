import { createHash, randomBytes } from 'node:crypto'

const TOKEN_BYTES = 32

/**
 * Generates an opaque 32-byte token encoded as base64url. The raw value
 * goes to the client (cookie, invitation link, password-reset URL); only
 * its SHA-256 hash is persisted, so a database leak does not surface
 * usable tokens.
 */
export function generateOpaqueToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url')
}

export function hashOpaqueToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
