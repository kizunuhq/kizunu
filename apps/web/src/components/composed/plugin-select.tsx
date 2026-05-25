import { useChannelPlugins } from '@kizunu/api-client/channel/use-channel-plugins'
import { LookupSelect } from '@kizunu/web/components/composed/lookup-select'

export function PluginSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const plugins = useChannelPlugins()
  const options = (plugins.data?.plugins ?? []).map((plugin) => ({
    value: plugin.id,
    label: plugin.name,
  }))

  return (
    <LookupSelect
      value={value}
      placeholder="Choose a channel plugin"
      options={options}
      onChange={onChange}
    />
  )
}
