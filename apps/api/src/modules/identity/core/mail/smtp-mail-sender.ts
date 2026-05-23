import type { Config } from '@kizunu/api/api.config'
import { ConfigService } from '@kizunu/config-module/config.service'
import { Injectable, Logger } from '@nestjs/common'
import { createTransport, type Transporter } from 'nodemailer'

import type { EmailMessage } from './email-message'
import { MailSender } from './mail-sender'

@Injectable()
export class SmtpMailSender extends MailSender {
  private readonly logger = new Logger(SmtpMailSender.name)
  private readonly transporter: Transporter
  private readonly from: string

  constructor(config: ConfigService<Config>) {
    super()
    const host = config.get('mail.smtpHost')
    const port = config.get('mail.smtpPort')
    const user = config.get('mail.smtpUser')
    const password = config.get('mail.smtpPassword')
    const secure = config.get('mail.smtpSecure')
    this.from = config.get('mail.from')
    this.transporter = createTransport({
      host,
      port,
      secure,
      auth: user ? { user, pass: password } : undefined,
    })
  }

  async send(message: EmailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: message.to,
      subject: message.subject,
      text: message.body,
    })
    this.logger.log(`mail sent to=${message.to} subject="${message.subject}"`)
  }
}
