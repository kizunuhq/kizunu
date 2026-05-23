import { EncryptedCredentialsService } from '@kizunu/nestjs-shared/modules/persistence/services/encrypted-credentials.service'

/**
 * Integration-test helper: returns an `EncryptedCredentialsService` built from
 * the same env-supplied key the booted app uses. Avoids each spec re-declaring
 * the AES-256-GCM seam when it instantiates a repository directly (the specs
 * skip Nest DI in favor of plain `new Repository(...)`).
 */
export function buildCredentialsCipher(): EncryptedCredentialsService {
  const key = process.env['APP_CREDENTIALS_ENCRYPTION_KEY']
  if (!key) throw new Error('APP_CREDENTIALS_ENCRYPTION_KEY is required for integration tests')
  return new EncryptedCredentialsService(key)
}
