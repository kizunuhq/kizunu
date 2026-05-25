import { z, type ZodType } from 'zod'

import type { CredentialField } from './credential-field'
import type { CredentialFieldType } from './credential-field-type'
import type { CredentialFields } from './credential-fields'
import { PluginCredentialsShapeUnsupportedException } from './plugin-credentials-shape-unsupported.exception'

export interface CredentialFieldMeta {
  label: string
  type: CredentialFieldType
  serverGenerated?: boolean
}

/**
 * Schemas attach `CredentialFieldMeta` to each credential field via
 * `.register(credentialFieldRegistry, { ... })` instead of inventing a meta
 * shape. The walker reads from this registry — typed, public, no `_def`
 * traversal — to derive `CredentialFields` for the channel/connector
 * manifests.
 *
 * Authors may register on the inner schema before chaining `.optional()` /
 * `.default()` (typical) OR on the wrapper itself; the walker tries the
 * outer first, then unwraps once.
 */
export const credentialFieldRegistry = z.registry<CredentialFieldMeta>()

export function describeCredentialFields(schema: ZodType): CredentialFields {
  if (schema instanceof z.ZodObject) {
    return { kind: 'flat', fields: walkShape(schema) }
  }
  if (schema instanceof z.ZodDiscriminatedUnion) {
    return walkDiscriminatedUnion(schema)
  }
  throw new PluginCredentialsShapeUnsupportedException(
    'expected ZodObject or ZodDiscriminatedUnion',
  )
}

function walkDiscriminatedUnion(schema: z.ZodDiscriminatedUnion): CredentialFields {
  const variants: Record<string, CredentialField[]> = {}
  let discriminatorKey: string | undefined
  for (const option of schema.options) {
    if (!(option instanceof z.ZodObject)) {
      throw new PluginCredentialsShapeUnsupportedException(
        'discriminated-union variants must be ZodObject',
      )
    }
    const { key, value } = findDiscriminator(option)
    if (discriminatorKey === undefined) discriminatorKey = key
    else if (discriminatorKey !== key) {
      throw new PluginCredentialsShapeUnsupportedException(
        `discriminated-union variants disagree on discriminator: "${discriminatorKey}" vs "${key}"`,
      )
    }
    variants[value] = walkShape(option, key)
  }
  if (discriminatorKey === undefined) {
    throw new PluginCredentialsShapeUnsupportedException('discriminated-union has no variants')
  }
  return { kind: 'discriminated', key: discriminatorKey, variants }
}

function findDiscriminator(option: z.ZodObject): { key: string; value: string } {
  for (const [key, field] of Object.entries(option.shape)) {
    if (field instanceof z.ZodLiteral) {
      const value = field.value
      if (typeof value !== 'string') {
        throw new PluginCredentialsShapeUnsupportedException(
          `discriminator literal at "${key}" must be a string`,
        )
      }
      return { key, value }
    }
  }
  throw new PluginCredentialsShapeUnsupportedException('variant has no literal discriminator')
}

function walkShape(object: z.ZodObject, skipKey?: string): CredentialField[] {
  return Object.entries(object.shape)
    .filter(([key]) => key !== skipKey)
    .map(([key, field]) => toCredentialField(key, field))
}

function toCredentialField(key: string, field: z.core.$ZodType): CredentialField {
  const meta = readMeta(field)
  const result: CredentialField = {
    key,
    label: meta?.label ?? key,
    type: meta?.type ?? 'text',
    required: isRequired(field),
  }
  if (meta?.serverGenerated) result.serverGenerated = true
  return result
}

function readMeta(field: z.core.$ZodType): CredentialFieldMeta | undefined {
  const direct = credentialFieldRegistry.get(field)
  if (direct) return direct
  if (field instanceof z.ZodOptional || field instanceof z.ZodDefault) {
    return credentialFieldRegistry.get(field.unwrap())
  }
  return undefined
}

function isRequired(field: z.core.$ZodType): boolean {
  return !(field instanceof z.ZodOptional) && !(field instanceof z.ZodDefault)
}
