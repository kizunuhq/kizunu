import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kizunu/web/components/primitives/select'

interface LookupSelectProps {
  value: string
  placeholder: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
  disabled?: boolean
}

function resolveLabel(value: string, options: LookupSelectProps['options'], placeholder: string) {
  if (!value) return placeholder
  return options.find((option) => option.value === value)?.label ?? placeholder
}

export function LookupSelect(props: LookupSelectProps) {
  return (
    <Select
      value={props.value}
      onValueChange={(value) => props.onChange(value ?? '')}
      disabled={props.disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder={props.placeholder}>
          {(value: string) => resolveLabel(value, props.options, props.placeholder)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {props.options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
