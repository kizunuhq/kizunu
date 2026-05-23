import { randomBytes } from 'node:crypto'

import { CredentialsDecryptionFailedException } from '@kizunu/nestjs-shared/lib/exceptions/credentials-decryption-failed.exception'
import { EncryptedCredentialsService } from '@kizunu/nestjs-shared/modules/persistence/services/encrypted-credentials.service'
import { describe, expect, it } from 'vite-plus/test'

function newKey(): string {
  return randomBytes(32).toString('base64')
}

describe('EncryptedCredentialsService', () => {
  it('round-trips a JSON object through encrypt + decrypt', () => {
    const service = new EncryptedCredentialsService(newKey())
    const value = { wabaId: 'waba-1', accessToken: 'top-secret', n: 42 }

    const envelope = service.encrypt(value)
    const back = service.decrypt(envelope)

    expect(envelope.alg).toBe('aes-256-gcm')
    expect(envelope.v).toBe(1)
    expect(envelope.iv.length).toBeGreaterThan(0)
    expect(envelope.tag.length).toBeGreaterThan(0)
    expect(envelope.data.length).toBeGreaterThan(0)
    expect(back).toEqual(value)
  })

  it('returns legacy plaintext values unchanged on decrypt (backward compatibility)', () => {
    const service = new EncryptedCredentialsService(newKey())
    const plaintext = { wabaId: 'waba-9', systemToken: 'live-token' }

    expect(service.decrypt(plaintext)).toEqual(plaintext)
    expect(service.decrypt(null)).toBeNull()
    expect(service.decrypt(undefined)).toBeUndefined()
  })

  it('throws CredentialsDecryptionFailedException when the IV has been tampered with', () => {
    const service = new EncryptedCredentialsService(newKey())
    const envelope = service.encrypt({ token: 'abc' })

    expect(() =>
      service.decrypt({ ...envelope, iv: Buffer.from('0'.repeat(12)).toString('base64') }),
    ).toThrow(CredentialsDecryptionFailedException)
  })

  it('throws CredentialsDecryptionFailedException when the auth tag has been tampered with', () => {
    const service = new EncryptedCredentialsService(newKey())
    const envelope = service.encrypt({ token: 'abc' })

    expect(() =>
      service.decrypt({ ...envelope, tag: Buffer.from('0'.repeat(16)).toString('base64') }),
    ).toThrow(CredentialsDecryptionFailedException)
  })

  it('throws CredentialsDecryptionFailedException when the ciphertext has been tampered with', () => {
    const service = new EncryptedCredentialsService(newKey())
    const envelope = service.encrypt({ token: 'abc' })
    const corruptedData = Buffer.from(envelope.data, 'base64')
    corruptedData[0] = (corruptedData[0] ?? 0) ^ 0xff

    expect(() => service.decrypt({ ...envelope, data: corruptedData.toString('base64') })).toThrow(
      CredentialsDecryptionFailedException,
    )
  })

  it('throws CredentialsDecryptionFailedException when the key changed since encryption', () => {
    const first = new EncryptedCredentialsService(newKey())
    const second = new EncryptedCredentialsService(newKey())
    const envelope = first.encrypt({ token: 'abc' })

    expect(() => second.decrypt(envelope)).toThrow(CredentialsDecryptionFailedException)
  })

  it('throws when asked to encrypt undefined (no value to wrap)', () => {
    const service = new EncryptedCredentialsService(newKey())

    expect(() => service.encrypt(undefined)).toThrow(/Cannot encrypt undefined/)
  })

  it('rejects a key whose decoded byte length is not 32', () => {
    expect(() => new EncryptedCredentialsService(Buffer.alloc(16).toString('base64'))).toThrow(
      /32-byte base64 encryption key/,
    )
  })

  it('encrypts the same input to different envelopes (random IV per call)', () => {
    const service = new EncryptedCredentialsService(newKey())
    const a = service.encrypt({ same: 'value' })
    const b = service.encrypt({ same: 'value' })

    expect(a.iv).not.toBe(b.iv)
    expect(a.data).not.toBe(b.data)
    expect(service.decrypt(a)).toEqual(service.decrypt(b))
  })
})
