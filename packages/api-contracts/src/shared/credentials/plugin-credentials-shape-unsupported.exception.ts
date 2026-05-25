export class PluginCredentialsShapeUnsupportedException extends Error {
  constructor(detail: string) {
    super(
      `Plugin credentials schema shape is not supported by the credential-field walker: ${detail}`,
    )
    this.name = 'PluginCredentialsShapeUnsupportedException'
  }
}
