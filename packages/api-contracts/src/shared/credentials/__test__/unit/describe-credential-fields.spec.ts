import { describe, expect, it } from 'vite-plus/test'
import { z } from 'zod'

import { credentialFieldRegistry, describeCredentialFields } from '../../describe-credential-fields'
import { PluginCredentialsShapeUnsupportedException } from '../../plugin-credentials-shape-unsupported.exception'

describe('describeCredentialFields', () => {
  describe('flat ZodObject', () => {
    it('emits one field per shape entry with registry metadata', () => {
      const schema = z
        .object({
          apiToken: z
            .string()
            .min(1)
            .register(credentialFieldRegistry, { label: 'API token', type: 'secret' }),
          companyDomain: z
            .string()
            .min(1)
            .register(credentialFieldRegistry, { label: 'Company domain', type: 'text' }),
        })
        .strict()

      const result = describeCredentialFields(schema)

      expect(result).toEqual({
        kind: 'flat',
        fields: [
          { key: 'apiToken', label: 'API token', type: 'secret', required: true },
          { key: 'companyDomain', label: 'Company domain', type: 'text', required: true },
        ],
      })
    })

    it('marks .optional() fields as required: false', () => {
      const schema = z
        .object({
          required: z
            .string()
            .min(1)
            .register(credentialFieldRegistry, { label: 'Required', type: 'text' }),
          optional: z
            .string()
            .register(credentialFieldRegistry, { label: 'Optional', type: 'text' })
            .optional(),
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
            .register(credentialFieldRegistry, { label: 'Activity type', type: 'text' })
            .default('task'),
        })
        .strict()

      const result = describeCredentialFields(schema)

      if (result.kind !== 'flat') throw new Error('expected flat')
      expect(result.fields).toEqual([
        { key: 'activityType', label: 'Activity type', type: 'text', required: false },
      ])
    })

    it('emits serverGenerated: true when the field meta sets it', () => {
      const schema = z
        .object({
          verifyToken: z.string().min(1).register(credentialFieldRegistry, {
            label: 'Verify token',
            type: 'secret',
            serverGenerated: true,
          }),
        })
        .strict()

      const result = describeCredentialFields(schema)

      if (result.kind !== 'flat') throw new Error('expected flat')
      expect(result.fields).toHaveLength(1)
      expect(result.fields[0]?.serverGenerated).toBe(true)
    })

    it('falls back to key + text type when the field is not registered', () => {
      const schema = z.object({ raw: z.string().min(1) }).strict()

      const result = describeCredentialFields(schema)

      if (result.kind !== 'flat') throw new Error('expected flat')
      expect(result.fields).toEqual([{ key: 'raw', label: 'raw', type: 'text', required: true }])
    })

    it('reads metadata from the inner schema when the wrapper carries no registration', () => {
      const schema = z
        .object({
          field: z
            .string()
            .min(1)
            .register(credentialFieldRegistry, { label: 'Inner-annotated', type: 'secret' })
            .optional(),
        })
        .strict()

      const result = describeCredentialFields(schema)

      if (result.kind !== 'flat') throw new Error('expected flat')
      expect(result.fields).toEqual([
        { key: 'field', label: 'Inner-annotated', type: 'secret', required: false },
      ])
    })
  })

  describe('ZodDiscriminatedUnion', () => {
    it('emits one variant per literal, stripping the discriminator key from each variant', () => {
      const schema = z.discriminatedUnion('channelMode', [
        z
          .object({
            channelMode: z.literal('cloud_api'),
            appId: z
              .string()
              .min(1)
              .register(credentialFieldRegistry, { label: 'App ID', type: 'text' }),
          })
          .strict(),
        z
          .object({
            channelMode: z.literal('coexistence'),
            accessToken: z
              .string()
              .min(1)
              .register(credentialFieldRegistry, { label: 'Access token', type: 'secret' }),
          })
          .strict(),
      ])

      const result = describeCredentialFields(schema)

      expect(result).toEqual({
        kind: 'discriminated',
        key: 'channelMode',
        variants: {
          cloud_api: [{ key: 'appId', label: 'App ID', type: 'text', required: true }],
          coexistence: [
            { key: 'accessToken', label: 'Access token', type: 'secret', required: true },
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
