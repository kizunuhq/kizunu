import { ResetPasswordForm } from '@kizunu/web/routes/auth/-components/reset-password-form'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }))

vi.mock('@kizunu/api-client/identity/use-reset-password', () => ({
  useResetPassword: () => ({
    mutate,
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
  }),
}))

describe('ResetPasswordForm', () => {
  beforeEach(() => {
    mutate.mockClear()
  })

  it('blocks submit and shows a length error when the password is shorter than 8 chars', () => {
    render(<ResetPasswordForm token="t-1" />)

    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'short' } })
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'short' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save new password' }))

    expect(screen.getByText('Password must be at least 8 characters.')).toBeInTheDocument()
    expect(mutate).not.toHaveBeenCalled()
  })

  it("blocks submit and shows a mismatch error when the passwords don't match", () => {
    render(<ResetPasswordForm token="t-1" />)

    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'longenough1' } })
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { value: 'different11' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save new password' }))

    expect(screen.getByText("Passwords don't match.")).toBeInTheDocument()
    expect(mutate).not.toHaveBeenCalled()
  })

  it('fires the mutation when both fields match and meet the length requirement', () => {
    render(<ResetPasswordForm token="t-1" />)

    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'longenough1' } })
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { value: 'longenough1' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save new password' }))

    expect(mutate).toHaveBeenCalledWith({ token: 't-1', password: 'longenough1' })
  })
})
