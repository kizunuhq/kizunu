import { useChannelPlugins } from '@kizunu/api-client/channel/use-channel-plugins'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kizunu/web/components/primitives/select'

const PLACEHOLDER = 'Choose a channel plugin'

function resolveName(value: string, plugins: Array<{ id: string; name: string }>) {
  if (!value) return PLACEHOLDER
  return plugins.find((plugin) => plugin.id === value)?.name ?? PLACEHOLDER
}

export function PluginSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const plugins = useChannelPlugins()
  const list = plugins.data?.plugins ?? []

  return (
    <Select value={value} onValueChange={(next) => onChange(next ?? '')}>
      <SelectTrigger>
        <SelectValue placeholder={PLACEHOLDER}>
          {(current: string) => resolveName(current, list)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {list.map((plugin) => (
          <SelectItem key={plugin.id} value={plugin.id}>
            {plugin.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
