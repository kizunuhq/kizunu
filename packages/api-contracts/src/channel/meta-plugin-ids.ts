export const MetaPluginId = {
  Cloud: 'meta-whatsapp',
  Coex: 'meta-whatsapp-coex',
} as const

export type MetaPluginId = (typeof MetaPluginId)[keyof typeof MetaPluginId]

export const META_PLUGIN_IDS: readonly string[] = [MetaPluginId.Cloud, MetaPluginId.Coex]

export function isMetaPluginId(id: string): boolean {
  return id === MetaPluginId.Cloud || id === MetaPluginId.Coex
}
