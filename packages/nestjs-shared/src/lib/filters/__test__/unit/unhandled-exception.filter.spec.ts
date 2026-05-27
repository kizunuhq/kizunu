import { UnhandledExceptionFilter } from '@kizunu/nestjs-shared/lib/filters/unhandled-exception.filter'
import type { ArgumentsHost } from '@nestjs/common'
import { BaseExceptionFilter } from '@nestjs/core'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

const useLoggerMock = vi.hoisted(() => vi.fn())

vi.mock('evlog/nestjs', () => ({
  useLogger: useLoggerMock,
}))

function buildHost(): ArgumentsHost {
  return {} as unknown as ArgumentsHost
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('UnhandledExceptionFilter', () => {
  it('logs the error via useLogger().error and delegates rendering to BaseExceptionFilter', () => {
    const errorSpy = vi.fn()
    useLoggerMock.mockReturnValueOnce({ error: errorSpy })
    const superCatch = vi.spyOn(BaseExceptionFilter.prototype, 'catch').mockImplementation(() => {})
    const filter = new UnhandledExceptionFilter()
    const host = buildHost()
    const original = new Error('boom')

    filter.catch(original, host)

    expect(errorSpy).toHaveBeenCalledWith(original)
    expect(superCatch).toHaveBeenCalledWith(original, host)
  })

  it('coerces a non-Error throw into an Error before logging it, then still delegates the original value to BaseExceptionFilter', () => {
    const errorSpy = vi.fn()
    useLoggerMock.mockReturnValueOnce({ error: errorSpy })
    const superCatch = vi.spyOn(BaseExceptionFilter.prototype, 'catch').mockImplementation(() => {})
    const filter = new UnhandledExceptionFilter()
    const host = buildHost()
    const original = 'plain string throw'

    filter.catch(original, host)

    const [loggedArg] = errorSpy.mock.calls[0] as [unknown]
    expect(loggedArg).toBeInstanceOf(Error)
    expect((loggedArg as Error).message).toBe('plain string throw')
    expect(superCatch).toHaveBeenCalledWith(original, host)
  })

  it('still delegates to BaseExceptionFilter when useLogger() throws (middleware miss)', () => {
    useLoggerMock.mockImplementationOnce(() => {
      throw new Error('no evlog middleware in scope')
    })
    const superCatch = vi.spyOn(BaseExceptionFilter.prototype, 'catch').mockImplementation(() => {})
    const filter = new UnhandledExceptionFilter()
    const host = buildHost()
    const original = new Error('still propagates')

    filter.catch(original, host)

    expect(superCatch).toHaveBeenCalledWith(original, host)
  })
})
