import { ApplicationException } from './application.exception'

/**
 * Raised when an encrypted `credentials` envelope fails AES-GCM auth-tag
 * verification (tampered IV, tag, or ciphertext, or wrong key). It is an
 * at-rest invariant violation, not a user input — surfaced as 500 with no
 * structured context.
 */
export class CredentialsDecryptionFailedException extends ApplicationException {
  constructor() {
    super(
      'credentials.decryption-failed',
      'Stored credentials could not be decrypted; the envelope is tampered or the encryption key changed.',
      500,
    )
  }
}
