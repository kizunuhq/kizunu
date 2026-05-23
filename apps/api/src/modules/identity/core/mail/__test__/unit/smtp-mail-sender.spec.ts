import type { Config } from '@kizunu/api/api.config'
import { SmtpMailSender } from '@kizunu/api/modules/identity/core/mail/smtp-mail-sender'
import type { ConfigService } from '@kizunu/config-module/config.service'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

const { sendMail, createTransport } = vi.hoisted(() => {
  const sendMailMock = vi.fn()
  const createTransportMock = vi.fn(() => ({ sendMail: sendMailMock }))
  return { sendMail: sendMailMock, createTransport: createTransportMock }
})

vi.mock('nodemailer', () => ({ createTransport }))

interface ConfigOverrides {
  smtpHost?: string
  smtpPort?: number
  smtpUser?: string
  smtpPassword?: string
  smtpSecure?: boolean
  from?: string
}

function buildConfig(overrides: ConfigOverrides = {}): ConfigService<Config> {
  const values: Record<string, unknown> = {
    'mail.smtpHost': 'mailpit',
    'mail.smtpPort': 1025,
    'mail.smtpUser': '',
    'mail.smtpPassword': '',
    'mail.smtpSecure': false,
    'mail.from': 'Kizunu <noreply@kizunu.local>',
  }
  for (const [key, value] of Object.entries(overrides)) {
    values[`mail.${key}`] = value
  }
  return { get: (key: string) => values[key] } as unknown as ConfigService<Config>
}

describe('SmtpMailSender', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('connects anonymously when smtpUser is empty', () => {
    const sender = new SmtpMailSender(buildConfig({ smtpUser: '' }))

    expect(sender).toBeDefined()
    expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({ auth: undefined }))
  })

  it('authenticates with user and password when smtpUser is set', () => {
    const sender = new SmtpMailSender(buildConfig({ smtpUser: 'apikey', smtpPassword: 'shh' }))

    expect(sender).toBeDefined()
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ auth: { user: 'apikey', pass: 'shh' } }),
    )
  })

  it('passes host, port, and secure flag through to the transport', () => {
    const sender = new SmtpMailSender(
      buildConfig({ smtpHost: 'smtp.example.com', smtpPort: 465, smtpSecure: true }),
    )

    expect(sender).toBeDefined()
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ host: 'smtp.example.com', port: 465, secure: true }),
    )
  })

  it('maps EmailMessage body to nodemailer text and uses the configured from', async () => {
    sendMail.mockResolvedValue(undefined)
    const sender = new SmtpMailSender(buildConfig({ from: 'Notifier <noreply@example.com>' }))

    await sender.send({ to: 'ada@example.com', subject: 'hi', body: 'hello' })

    expect(sendMail).toHaveBeenCalledWith({
      from: 'Notifier <noreply@example.com>',
      to: 'ada@example.com',
      subject: 'hi',
      text: 'hello',
    })
  })

  it('propagates SMTP rejections from the transport', async () => {
    sendMail.mockRejectedValue(new Error('connection refused'))
    const sender = new SmtpMailSender(buildConfig())

    await expect(
      sender.send({ to: 'ada@example.com', subject: 'hi', body: 'hello' }),
    ).rejects.toThrow('connection refused')
  })
})
