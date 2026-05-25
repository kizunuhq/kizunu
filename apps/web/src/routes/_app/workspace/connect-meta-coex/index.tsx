import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/workspace/connect-meta-coex/')({
  beforeLoad: () => {
    throw redirect({ to: '/settings/channels', search: { addCoex: 1 } })
  },
})
