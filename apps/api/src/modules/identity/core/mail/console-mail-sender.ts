import { Injectable, Logger } from '@nestjs/common'

import type { EmailMessage } from './email-message'
import { MailSender } from './mail-sender'

/**
 * v0.1 mail transport: logs the message instead of delivering it. Lets the
 * password-reset flow ship without a real provider while keeping the token
 * off the HTTP response. Swap behind `MailSender` when a provider lands.
 */
@Injectable()
export class ConsoleMailSender extends MailSender {
  private readonly logger = new Logger(ConsoleMailSender.name)

  async send(message: EmailMessage): Promise<void> {
    this.logger.log(`mail to=${message.to} subject="${message.subject}"\n${message.body}`)
  }
}
