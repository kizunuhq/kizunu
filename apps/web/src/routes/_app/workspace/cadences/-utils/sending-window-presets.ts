import type { SendingWindowInput } from '@kizunu/api-contracts/cadence'

const SP_TZ = 'America/Sao_Paulo'
const WEEKDAYS = [1, 2, 3, 4, 5] as const
const MINUTES_PER_HOUR = 60

export const SENDING_WINDOW_PRESET_KEYS = [
  'always_on',
  'business_hours',
  'weekdays_extended',
] as const

export type SendingWindowPresetKey = (typeof SENDING_WINDOW_PRESET_KEYS)[number]

interface SendingWindowPreset {
  key: SendingWindowPresetKey
  label: string
  description: string
  toWindow: () => SendingWindowInput | null
}

export const SENDING_WINDOW_PRESETS: readonly SendingWindowPreset[] = [
  {
    key: 'always_on',
    label: 'Always on',
    description: 'Dispatch any time (default)',
    toWindow: () => null,
  },
  {
    key: 'business_hours',
    label: 'Business hours',
    description: 'Mon-Fri, 9am-6pm São Paulo',
    toWindow: () => ({
      timezone: SP_TZ,
      days: [...WEEKDAYS],
      startMinute: 9 * MINUTES_PER_HOUR,
      endMinute: 18 * MINUTES_PER_HOUR,
    }),
  },
  {
    key: 'weekdays_extended',
    label: 'Weekdays (extended)',
    description: 'Mon-Fri, 8am-8pm São Paulo',
    toWindow: () => ({
      timezone: SP_TZ,
      days: [...WEEKDAYS],
      startMinute: 8 * MINUTES_PER_HOUR,
      endMinute: 20 * MINUTES_PER_HOUR,
    }),
  },
]

export function presetToSendingWindow(key: SendingWindowPresetKey): SendingWindowInput | null {
  const preset = SENDING_WINDOW_PRESETS.find((p) => p.key === key)
  if (!preset) return null
  return preset.toWindow()
}

export function parseSendingWindowPresetKey(value: string | null): SendingWindowPresetKey {
  const match = SENDING_WINDOW_PRESET_KEYS.find((key) => key === value)
  return match ?? 'always_on'
}
