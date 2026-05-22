import type { EmailMessage } from './email-message'

/**
 * Outbound mail boundary. The abstract class doubles as the DI token so a real
 * transport (SMTP/provider) can be swapped behind it without touching callers.
 * v0.1 binds it to `ConsoleMailSender`; sensitive payloads (reset tokens) travel
 * here out-of-band, never in an HTTP response.
 */
export abstract class MailSender {
  abstract send(message: EmailMessage): Promise<void>
}
