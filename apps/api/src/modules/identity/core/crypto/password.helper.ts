/**
 * Password hashing wrapper. Under Bun (production and dev) it uses
 * `Bun.password` with argon2id — memory-hard and resistant to GPU brute force.
 * Under the node-based test runner `Bun` is unavailable, so it falls back to
 * node's `scrypt`. Each runtime stays internally consistent: a hash produced in
 * one runtime is verified in the same runtime, never across the boundary.
 */

import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const saltBytes = 16
const derivedKeyLength = 64
const scryptPrefix = 'scrypt'

const bunPassword = typeof Bun === 'undefined' ? undefined : Bun.password

export async function hashPassword(plain: string): Promise<string> {
  if (bunPassword) return await bunPassword.hash(plain)
  return hashWithScrypt(plain)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (hash.startsWith(`${scryptPrefix}$`)) return verifyWithScrypt(plain, hash)
  if (bunPassword) return await bunPassword.verify(plain, hash)
  return false
}

function hashWithScrypt(plain: string): string {
  const salt = randomBytes(saltBytes).toString('hex')
  const derived = scryptSync(plain, salt, derivedKeyLength).toString('hex')
  return `${scryptPrefix}$${salt}$${derived}`
}

function verifyWithScrypt(plain: string, hash: string): boolean {
  const [, salt, derived] = hash.split('$')
  if (!salt || !derived) return false
  const expected = Buffer.from(derived, 'hex')
  const actual = scryptSync(plain, salt, derivedKeyLength)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}
