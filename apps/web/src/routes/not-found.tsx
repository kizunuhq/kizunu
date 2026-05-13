import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/not-found')({
  component: NotFoundComponent,
})

function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="font-semibold text-2xl">Page not found</h1>
      <Link
        className="rounded-md border border-neutral-300 px-3 py-1 text-sm hover:bg-neutral-100"
        to="/"
      >
        Back home
      </Link>
    </div>
  )
}
