import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

// The integration/e2e specs run in a node worker with no `Bun` global, but the
// app under test reaches for two Bun APIs: `Bun.randomUUIDv7()` (Drizzle id
// defaults) and `Bun.password` (identity hashing). Polyfill both with node
// equivalents so the real app runs unchanged. scrypt stands in for argon2id —
// hashes are produced and verified inside the same worker, so the substitution
// is invisible to the tests and never leaks into production crypto.

const saltBytes = 16
const derivedKeyLength = 64

function hashPassword(plain: string): string {
  const salt = randomBytes(saltBytes).toString('hex')
  const derived = scryptSync(plain, salt, derivedKeyLength).toString('hex')
  return `${salt}$${derived}`
}

function verifyPassword(plain: string, hash: string): boolean {
  const [salt, derived] = hash.split('$')
  if (!salt || !derived) return false
  const expected = Buffer.from(derived, 'hex')
  const actual = scryptSync(plain, salt, derivedKeyLength)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

export function installBunPolyfill(): void {
  const target = globalThis as { Bun?: unknown }
  if (typeof target.Bun !== 'undefined') return
  target.Bun = {
    randomUUIDv7: () => crypto.randomUUID(),
    password: {
      hash: (plain: string) => Promise.resolve(hashPassword(plain)),
      verify: (plain: string, hash: string) => Promise.resolve(verifyPassword(plain, hash)),
    },
  }
}
