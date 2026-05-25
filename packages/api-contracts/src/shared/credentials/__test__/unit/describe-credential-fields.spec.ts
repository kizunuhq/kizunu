import { describe, expect, it } from 'vite-plus/test'
import { z } from 'zod'

import { CredentialFieldKind } from '../../credential-field-kind'
import { describeCredentialFields } from '../../describe-credential-fields'
import { PluginCredentialsShapeUnsupportedException } from '../../plugin-credentials-shape-unsupported.exception'

describe('describeCredentialFields', () => {
  describe('flat ZodObject', () => {
    it('emits one field per shape entry with .meta() label and kind', () => {
      const schema = z
        .object({
          apiToken: z.string().min(1).meta({ label: 'API token', kind: 'secret' }),
          companyDomain: z.string().min(1).meta({ label: 'Company domain', kind: 'text' }),
        })
        .strict()

      const result = describeCredentialFields(schema)

      expect(result).toEqual({
        kind: 'flat',
        fields: [
          { key: 'apiToken', label: 'API token', kind: CredentialFieldKind.Secret, required: true },
          {
            key: 'companyDomain',
            label: 'Company domain',
            kind: CredentialFieldKind.Text,
            required: true,
          },
        ],
      })
    })

    it('marks .optional() fields as required: false', () => {
      const schema = z
        .object({
          required: z.string().min(1).meta({ label: 'Required', kind: 'text' }),
          optional: z.string().optional().meta({ label: 'Optional', kind: 'text' }),
        })
        .strict()

      const result = describeCredentialFields(schema)

      if (result.kind !== 'flat') throw new Error('expected flat')
      expect(result.fields.map((field) => ({ key: field.key, required: field.required }))).toEqual([
        { key: 'required', required: true },
        { key: 'optional', required: false },
      ])
    })

    it('marks .default() fields as required: false', () => {
      const schema = z
        .object({
          activityType: z
            .string()
            .min(1)
            .default('task')
            .meta({ label: 'Activity type', kind: 'text' }),
        })
        .strict()

      const result = describeCredentialFields(schema)

      if (result.kind !== 'flat') throw new Error('expected flat')
      expect(result.fields).toEqual([
        {
          key: 'activityType',
          label: 'Activity type',
          kind: CredentialFieldKind.Text,
          required: false,
        },
      ])
    })

    it('emits serverGenerated: true when the field meta sets it', () => {
      const schema = z
        .object({
          verifyToken: z
            .string()
            .min(1)
            .meta({ label: 'Verify token', kind: 'secret', serverGenerated: true }),
        })
        .strict()

      const result = describeCredentialFields(schema)

      if (result.kind !== 'flat') throw new Error('expected flat')
      expect(result.fields).toHaveLength(1)
      expect(result.fields[0]?.serverGenerated).toBe(true)
    })

    it('falls back to key + text kind when .meta() is missing', () => {
      const schema = z.object({ raw: z.string().min(1) }).strict()

      const result = describeCredentialFields(schema)

      if (result.kind !== 'flat') throw new Error('expected flat')
      expect(result.fields).toEqual([
        {
          key: 'raw',
          label: 'raw',
          kind: CredentialFieldKind.Text,
          required: true,
        },
      ])
    })

    it('reads .meta() from the inner type when the outer wrapper has none', () => {
      const schema = z
        .object({
          field: z.string().min(1).meta({ label: 'Inner-annotated', kind: 'secret' }).optional(),
        })
        .strict()

      const result = describeCredentialFields(schema)

      if (result.kind !== 'flat') throw new Error('expected flat')
      expect(result.fields).toEqual([
        {
          key: 'field',
          label: 'Inner-annotated',
          kind: CredentialFieldKind.Secret,
          required: false,
        },
      ])
    })
  })

  describe('ZodDiscriminatedUnion', () => {
    it('emits one variant per literal, stripping the discriminator key from each variant', () => {
      const schema = z.discriminatedUnion('channelMode', [
        z
          .object({
            channelMode: z.literal('cloud_api'),
            appId: z.string().min(1).meta({ label: 'App ID', kind: 'text' }),
          })
          .strict(),
        z
          .object({
            channelMode: z.literal('coexistence'),
            accessToken: z.string().min(1).meta({ label: 'Access token', kind: 'secret' }),
          })
          .strict(),
      ])

      const result = describeCredentialFields(schema)

      expect(result).toEqual({
        kind: 'discriminated',
        key: 'channelMode',
        variants: {
          cloud_api: [
            { key: 'appId', label: 'App ID', kind: CredentialFieldKind.Text, required: true },
          ],
          coexistence: [
            {
              key: 'accessToken',
              label: 'Access token',
              kind: CredentialFieldKind.Secret,
              required: true,
            },
          ],
        },
      })
    })
  })

  describe('unsupported shapes', () => {
    it('throws PluginCredentialsShapeUnsupportedException for a bare ZodString', () => {
      expect(() => describeCredentialFields(z.string())).toThrow(
        PluginCredentialsShapeUnsupportedException,
      )
    })

    it('throws for a non-discriminated union', () => {
      expect(() => describeCredentialFields(z.union([z.string(), z.number()]))).toThrow(
        PluginCredentialsShapeUnsupportedException,
      )
    })
  })
})
