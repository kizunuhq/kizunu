/**
 * On-disk shape of an encrypted credentials blob. Stored as JSONB on the same
 * `credentials` column the repos already use; the `alg` field discriminates
 * encrypted envelopes from pre-030 plaintext rows. `v` reserves room for a
 * future key-version or alg-rotation extension without breaking existing rows.
 *
 * `iv`, `tag`, `data` are base64-encoded byte strings. `data` is the AES-GCM
 * ciphertext of `JSON.stringify(plaintext)`.
 */
export interface EncryptedCredentialsEnvelope {
  alg: 'aes-256-gcm'
  v: 1
  iv: string
  tag: string
  data: string
}
