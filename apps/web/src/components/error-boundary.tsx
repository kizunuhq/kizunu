import { getApiErrorMessage } from '../lib/get-api-error-message'

interface RouteErrorProps {
  error: Error
  reset: () => void
}

export function RouteError({ error, reset }: RouteErrorProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="font-semibold text-2xl">Something went wrong</h1>
      <pre className="max-w-prose whitespace-pre-wrap text-red-600 text-sm">
        {getApiErrorMessage(error)}
      </pre>
      <button
        className="rounded-md border border-neutral-300 px-3 py-1 text-sm hover:bg-neutral-100"
        onClick={reset}
        type="button"
      >
        Try again
      </button>
    </div>
  )
}
