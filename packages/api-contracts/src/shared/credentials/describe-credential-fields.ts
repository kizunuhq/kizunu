import type { ZodTypeAny } from 'zod'

import type { CredentialField } from './credential-field'
import { CredentialFieldKind } from './credential-field-kind'
import type { CredentialFields } from './credential-fields'
import { PluginCredentialsShapeUnsupportedException } from './plugin-credentials-shape-unsupported.exception'

interface FieldMeta {
  label?: string
  kind?: CredentialFieldKind
  serverGenerated?: boolean
}

export function describeCredentialFields(schema: ZodTypeAny): CredentialFields {
  const def = readDef(schema)
  if (def.type === 'object') {
    return { kind: 'flat', fields: walkObject(def) }
  }
  if (def.type === 'union' && typeof def.discriminator === 'string') {
    return walkDiscriminatedUnion(def.discriminator, def.options)
  }
  throw new PluginCredentialsShapeUnsupportedException(
    `expected ZodObject or ZodDiscriminatedUnion, got ${def.type}`,
  )
}

function walkDiscriminatedUnion(key: string, options: readonly unknown[]): CredentialFields {
  const variants: Record<string, CredentialField[]> = {}
  for (const option of options) {
    const optionDef = readDef(option)
    if (optionDef.type !== 'object') {
      throw new PluginCredentialsShapeUnsupportedException(
        'discriminated-union variants must be ZodObject',
      )
    }
    const literalValue = readLiteralValue(optionDef.shape[key])
    if (literalValue === undefined) {
      throw new PluginCredentialsShapeUnsupportedException(
        `discriminated-union variant is missing literal at key "${key}"`,
      )
    }
    variants[literalValue] = walkObject(optionDef, key)
  }
  return { kind: 'discriminated', key, variants }
}

function walkObject(def: ZodDef, skipKey?: string): CredentialField[] {
  const fields: CredentialField[] = []
  for (const [key, field] of Object.entries(def.shape)) {
    if (key === skipKey) continue
    fields.push(toCredentialField(key, field))
  }
  return fields
}

function toCredentialField(key: string, field: unknown): CredentialField {
  const meta = readMeta(field)
  const result: CredentialField = {
    key,
    label: meta.label ?? key,
    kind: meta.kind ?? CredentialFieldKind.Text,
    required: !isOptional(field),
  }
  if (meta.serverGenerated) result.serverGenerated = true
  return result
}

function isOptional(field: unknown): boolean {
  const fn = readFn(field, 'isOptional')
  return typeof fn === 'function' ? fn() === true : false
}

function readMeta(field: unknown): FieldMeta {
  const outer = toFieldMeta(callOptionalFn(field, 'meta'))
  if (outer) return outer
  const def = readDef(field)
  if (def.innerType !== undefined) {
    return toFieldMeta(callOptionalFn(def.innerType, 'meta')) ?? {}
  }
  return {}
}

function toFieldMeta(value: unknown): FieldMeta | undefined {
  if (!value || typeof value !== 'object') return undefined
  const record = value as Record<string, unknown>
  const meta: FieldMeta = {}
  if (typeof record['label'] === 'string') meta.label = record['label']
  if (
    record['kind'] === CredentialFieldKind.Text ||
    record['kind'] === CredentialFieldKind.Secret
  ) {
    meta.kind = record['kind']
  }
  if (typeof record['serverGenerated'] === 'boolean') {
    meta.serverGenerated = record['serverGenerated']
  }
  return meta
}

function readLiteralValue(field: unknown): string | undefined {
  if (field === undefined) return undefined
  const def = readDef(field)
  if (def.type !== 'literal') return undefined
  const value = def.values[0]
  return typeof value === 'string' ? value : undefined
}

interface ZodDef {
  type: string
  shape: Record<string, unknown>
  innerType: unknown
  discriminator: string | undefined
  options: readonly unknown[]
  values: readonly unknown[]
}

function readDef(field: unknown): ZodDef {
  if (!field || typeof field !== 'object') {
    throw new PluginCredentialsShapeUnsupportedException('zod schema is missing its _def/def')
  }
  const record = field as Record<string, unknown>
  const raw = record['_def'] ?? record['def']
  if (!raw || typeof raw !== 'object') {
    throw new PluginCredentialsShapeUnsupportedException('zod schema is missing its _def/def')
  }
  const rec = raw as Record<string, unknown>
  return {
    type: typeof rec['type'] === 'string' ? rec['type'] : '',
    shape:
      rec['shape'] && typeof rec['shape'] === 'object'
        ? (rec['shape'] as Record<string, unknown>)
        : {},
    innerType: rec['innerType'],
    discriminator: typeof rec['discriminator'] === 'string' ? rec['discriminator'] : undefined,
    options: Array.isArray(rec['options']) ? rec['options'] : [],
    values: Array.isArray(rec['values']) ? rec['values'] : [],
  }
}

function readFn(field: unknown, key: string): unknown {
  if (!field || typeof field !== 'object') return undefined
  return (field as Record<string, unknown>)[key]
}

function callOptionalFn(field: unknown, key: string): unknown {
  const fn = readFn(field, key)
  return typeof fn === 'function' ? (fn as () => unknown).call(field) : undefined
}
