/**
 * Result of a plugin's `validate` hook. The engine acts only on this — channel
 * peculiarities (Meta's 24h window, HSM templates) are resolved inside the plugin
 * and surface here as a plain decision. `reason` explains a `skip`/`error`
 * (e.g. `template_required`).
 */
export interface ChannelDecision {
  action: 'send' | 'skip' | 'error'
  mode?: 'freeform' | 'template'
  reason?: string
}
