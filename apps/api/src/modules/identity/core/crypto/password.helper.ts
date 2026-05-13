/**
 * Password hashing wrapper around `Bun.password`. Uses argon2id by default
 * (Bun's standard), which is memory-hard and resistant to GPU brute force.
 */

export async function hashPassword(plain: string): Promise<string> {
  return await Bun.password.hash(plain)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return await Bun.password.verify(plain, hash)
}
