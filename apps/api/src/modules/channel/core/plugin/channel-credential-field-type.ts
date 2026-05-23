/**
 * How a credential field is captured in the generated account form. `secret` masks
 * the input (e.g. tokens); `text` is shown in the clear. The form is a render hint —
 * the plugin's configSchema stays the validation authority.
 */
export const ChannelCredentialFieldType = {
  Text: 'text',
  Secret: 'secret',
} as const

export type ChannelCredentialFieldType =
  (typeof ChannelCredentialFieldType)[keyof typeof ChannelCredentialFieldType]
