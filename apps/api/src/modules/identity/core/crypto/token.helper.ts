import { createHash, randomBytes } from 'node:crypto'

const TOKEN_BYTES = 32

/**
 * Generates an opaque 32-byte session token encoded as base64url. The raw
 * value goes to the client cookie; only the SHA-256 hash is stored on the
 * server, so a database leak does not surface usable session tokens.
 */
export function generateSessionToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url')
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
