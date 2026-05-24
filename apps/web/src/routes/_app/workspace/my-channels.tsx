import { MyChannelsTable } from '@kizunu/web/routes/_app/workspace/-components/my-channels-table'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/workspace/my-channels')({
  component: MyChannelsPage,
})

function MyChannelsPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">My channels</h1>
      <MyChannelsTable />
    </div>
  )
}
