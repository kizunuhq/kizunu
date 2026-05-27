import { UnhandledExceptionFilter } from '@kizunu/nestjs-shared/lib/filters/unhandled-exception.filter'
import type { ArgumentsHost } from '@nestjs/common'
import { describe, expect, it, vi } from 'vite-plus/test'

const useLoggerMock = vi.hoisted(() => vi.fn())

vi.mock('evlog/nestjs', () => ({
  useLogger: useLoggerMock,
}))

function buildHost(): ArgumentsHost {
  return {} as unknown as ArgumentsHost
}

describe('UnhandledExceptionFilter', () => {
  it('logs the error via useLogger().error and rethrows the original Error', () => {
    const errorSpy = vi.fn()
    useLoggerMock.mockReturnValueOnce({ error: errorSpy })
    const filter = new UnhandledExceptionFilter()
    const original = new Error('boom')

    expect(() => filter.catch(original, buildHost())).toThrow(original)
    expect(errorSpy).toHaveBeenCalledTimes(1)
    expect(errorSpy).toHaveBeenCalledWith(original)
  })

  it('coerces a non-Error throw into an Error before logging it, then rethrows the original value', () => {
    const errorSpy = vi.fn()
    useLoggerMock.mockReturnValueOnce({ error: errorSpy })
    const filter = new UnhandledExceptionFilter()
    const original = 'plain string throw'

    expect(() => filter.catch(original, buildHost())).toThrow('plain string throw')
    expect(errorSpy).toHaveBeenCalledTimes(1)
    const [loggedArg] = errorSpy.mock.calls[0] as [unknown]
    expect(loggedArg).toBeInstanceOf(Error)
    expect((loggedArg as Error).message).toBe('plain string throw')
  })

  it('rethrows the original exception even when useLogger() throws (middleware miss)', () => {
    useLoggerMock.mockImplementationOnce(() => {
      throw new Error('no evlog middleware in scope')
    })
    const filter = new UnhandledExceptionFilter()
    const original = new Error('still propagates')

    expect(() => filter.catch(original, buildHost())).toThrow(original)
  })
})
