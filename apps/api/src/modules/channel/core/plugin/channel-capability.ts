/**
 * Static capabilities a channel plugin declares in its manifest. The engine reads
 * these to know, ahead of any send, what a channel can do.
 */
export type ChannelCapability = 'freeform' | 'template' | 'media'
