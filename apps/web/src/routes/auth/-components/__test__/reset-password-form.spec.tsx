import { resetPasswordFormSchema } from '@kizunu/web/routes/auth/-components/reset-password-form'
import { describe, expect, it } from 'vite-plus/test'

describe('resetPasswordFormSchema', () => {
  it('rejects passwords shorter than 8 characters with a field-level error on password', () => {
    const result = resetPasswordFormSchema.safeParse({
      password: 'short',
      confirmPassword: 'short',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const passwordIssue = result.error.issues.find((issue) => issue.path[0] === 'password')
      expect(passwordIssue).toBeDefined()
    }
  })

  it('rejects mismatched confirm-password with a field-level error on confirmPassword', () => {
    const result = resetPasswordFormSchema.safeParse({
      password: 'longenough1',
      confirmPassword: 'different11',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const confirmIssue = result.error.issues.find((issue) => issue.path[0] === 'confirmPassword')
      expect(confirmIssue?.message).toBe("Passwords don't match.")
    }
  })

  it('accepts matching passwords meeting the length requirement', () => {
    const result = resetPasswordFormSchema.safeParse({
      password: 'longenough1',
      confirmPassword: 'longenough1',
    })

    expect(result.success).toBe(true)
  })

  it('does not fire the mismatch rule until the user has typed in confirmPassword', () => {
    const result = resetPasswordFormSchema.safeParse({
      password: 'longenough1',
      confirmPassword: '',
    })

    expect(result.success).toBe(true)
  })
})
