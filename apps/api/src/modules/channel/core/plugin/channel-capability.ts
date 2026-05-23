/**
 * Static capabilities a channel plugin declares in its manifest. The engine reads
 * these to know, ahead of any send, what a channel can do.
 */
export const ChannelCapability = {
  Freeform: 'freeform',
  Template: 'template',
  Media: 'media',
} as const

export type ChannelCapability = (typeof ChannelCapability)[keyof typeof ChannelCapability]
