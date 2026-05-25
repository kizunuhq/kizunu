export const MetaPluginId = {
  Cloud: 'meta-whatsapp',
  Coex: 'meta-whatsapp-coex',
} as const

export type MetaPluginId = (typeof MetaPluginId)[keyof typeof MetaPluginId]

export function isMetaPluginId(id: string): boolean {
  return id === MetaPluginId.Cloud || id === MetaPluginId.Coex
}
