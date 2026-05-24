import { useChannelPlugins } from '@kizunu/api-client/channel/use-channel-plugins'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kizunu/web/components/primitives/select'

export function PluginSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const plugins = useChannelPlugins()

  return (
    <Select value={value} onValueChange={(next) => onChange(next ?? '')}>
      <SelectTrigger>
        <SelectValue placeholder="Choose a channel plugin" />
      </SelectTrigger>
      <SelectContent>
        {(plugins.data?.plugins ?? []).map((plugin) => (
          <SelectItem key={plugin.id} value={plugin.id}>
            {plugin.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
