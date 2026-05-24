import type { Config } from '@kizunu/api/api.config'
import { ConfigService } from '@kizunu/config-module/config.service'
import { Logger } from '@nestjs/common'
import { createTransport, type Transporter } from 'nodemailer'

import type { EmailMessage } from './email-message'
import { MailSender } from './mail-sender'

export class SmtpMailSender extends MailSender {
  private readonly logger = new Logger(SmtpMailSender.name)
  private readonly transporter: Transporter
  private readonly from: string

  constructor(config: ConfigService<Config>) {
    super()
    const user = config.get('mail.smtpUser')
    this.from = config.get('mail.from')
    this.transporter = createTransport({
      host: config.get('mail.smtpHost'),
      port: config.get('mail.smtpPort'),
      secure: config.get('mail.smtpSecure'),
      auth: user ? { user, pass: config.get('mail.smtpPassword') } : undefined,
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
