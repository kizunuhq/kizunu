/**
 * What the engine hands a plugin to send: the resolved recipient, the mode the
 * plugin's `validate` settled on, and either freeform `body` or a template
 * reference. The plugin maps this onto its provider API.
 */
export interface SendPayload {
  to: string
  mode: 'freeform' | 'template'
  body?: string
  template?: {
    name: string
    language: string
    variables?: Record<string, string>
  }
}
