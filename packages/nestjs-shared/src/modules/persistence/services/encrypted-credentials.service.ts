import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

import { CredentialsDecryptionFailedException } from '@kizunu/nestjs-shared/lib/exceptions/credentials-decryption-failed.exception'
import { Injectable } from '@nestjs/common'

import type { EncryptedCredentialsEnvelope } from './encrypted-credentials-envelope'

const ALG: EncryptedCredentialsEnvelope['alg'] = 'aes-256-gcm'
const VERSION: EncryptedCredentialsEnvelope['v'] = 1
const IV_BYTE_LENGTH = 12
const KEY_BYTE_LENGTH = 32
const AUTH_TAG_BYTE_LENGTH = 16

/**
 * At-rest encryption boundary for credentials JSONB columns. Plugins,
 * use-cases, and engine services see plaintext credentials; repositories call
 * `encrypt` on every write path and `decrypt` on every read path.
 *
 * `decrypt` is backward-compatible: a value that is not an envelope
 * (`!isEnvelope(value)`) is returned unchanged so pre-030 plaintext rows
 * continue to read transparently while new writes encrypt going forward.
 * Tampering (wrong IV, tag, ciphertext, or key) throws
 * {@link CredentialsDecryptionFailedException} — there is no silent garbage.
 */
@Injectable()
export class EncryptedCredentialsService {
  private readonly key: Buffer

  constructor(encryptionKeyBase64: string) {
    const key = Buffer.from(encryptionKeyBase64, 'base64')
    if (key.length !== KEY_BYTE_LENGTH) {
      throw new Error(
        `Expected a ${KEY_BYTE_LENGTH}-byte base64 encryption key; got ${key.length} bytes.`,
      )
    }
    this.key = key
  }

  encrypt(value: unknown): EncryptedCredentialsEnvelope {
    if (value === undefined) {
      throw new Error('Cannot encrypt undefined; pass a value (object or primitive).')
    }
    const iv = randomBytes(IV_BYTE_LENGTH)
    const cipher = createCipheriv(ALG, this.key, iv)
    const plaintext = Buffer.from(JSON.stringify(value), 'utf8')
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
    const tag = cipher.getAuthTag()
    return {
      alg: ALG,
      v: VERSION,
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      data: ciphertext.toString('base64'),
    }
  }

  decrypt(value: unknown): unknown {
    if (!this.isEnvelope(value)) return value
    return this.decryptEnvelope(value)
  }

  isEnvelope(value: unknown): value is EncryptedCredentialsEnvelope {
    if (!value || typeof value !== 'object') return false
    if (!('alg' in value) || !('v' in value)) return false
    return value.alg === ALG && value.v === VERSION
  }

  private decryptEnvelope(envelope: EncryptedCredentialsEnvelope): unknown {
    const iv = Buffer.from(envelope.iv, 'base64')
    const tag = Buffer.from(envelope.tag, 'base64')
    const ciphertext = Buffer.from(envelope.data, 'base64')
    if (tag.length !== AUTH_TAG_BYTE_LENGTH) {
      throw new CredentialsDecryptionFailedException()
    }
    const decipher = createDecipheriv(ALG, this.key, iv)
    decipher.setAuthTag(tag)
    try {
      const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
      return JSON.parse(plaintext.toString('utf8'))
    } catch {
      throw new CredentialsDecryptionFailedException()
    }
  }
}
