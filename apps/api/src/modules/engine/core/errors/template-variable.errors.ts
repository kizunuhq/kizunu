/**
 * Engine-internal exception thrown by the TemplateVariableResolver when a
 * declared variable cannot be resolved to a non-empty value from the Lead
 * context. The dispatcher catches it, parks the journey in error_state,
 * and never surfaces it to HTTP.
 */
export class TemplateVariableUnresolvedException extends Error {
  constructor(public readonly variableName: string) {
    super(`Template variable "${variableName}" could not be resolved from the lead.`)
    this.name = 'TemplateVariableUnresolvedException'
  }
}

/**
 * Engine-internal exception thrown by the TemplateVariableResolver when a
 * template declares a variable name the resolver does not know how to
 * map. Same handling as TemplateVariableUnresolvedException; distinct
 * reason on the resulting error_state so admins can tell apart "fix the
 * deal" from "fix the template".
 */
export class TemplateVariableUnknownException extends Error {
  constructor(public readonly variableName: string) {
    super(`Template variable "${variableName}" is not a known variable name.`)
    this.name = 'TemplateVariableUnknownException'
  }
}
