import {
  TemplateVariableUnknownException,
  TemplateVariableUnresolvedException,
} from '@kizunu/api/modules/engine/core/errors/template-variable.errors'
import {
  type LeadVariableContext,
  TemplateVariableResolver,
} from '@kizunu/api/modules/engine/core/services/template-variable-resolver'
import { describe, expect, it } from 'vite-plus/test'

const resolver = new TemplateVariableResolver()

const completeLead: LeadVariableContext = {
  name: 'Ada Lovelace',
  phone: '+5511999000111',
  ownerExternalId: '42',
}

describe('TemplateVariableResolver.resolve', () => {
  it('returns the first token of name for leadFirstName', () => {
    const result = resolver.resolve(['leadFirstName'], { lead: completeLead })

    expect(result).toEqual({ leadFirstName: 'Ada' })
  })

  it('returns the full name for leadName', () => {
    const result = resolver.resolve(['leadName'], { lead: completeLead })

    expect(result).toEqual({ leadName: 'Ada Lovelace' })
  })

  it('returns phone for leadPhone', () => {
    const result = resolver.resolve(['leadPhone'], { lead: completeLead })

    expect(result).toEqual({ leadPhone: '+5511999000111' })
  })

  it('returns the owner external id for ownerExternalId', () => {
    const result = resolver.resolve(['ownerExternalId'], { lead: completeLead })

    expect(result).toEqual({ ownerExternalId: '42' })
  })

  it('resolves multiple variables in declared order', () => {
    const result = resolver.resolve(['leadFirstName', 'leadPhone'], { lead: completeLead })

    expect(Object.entries(result)).toEqual([
      ['leadFirstName', 'Ada'],
      ['leadPhone', '+5511999000111'],
    ])
  })

  it('dedupes repeated variable names', () => {
    const result = resolver.resolve(['leadFirstName', 'leadFirstName'], { lead: completeLead })

    expect(result).toEqual({ leadFirstName: 'Ada' })
  })

  it('throws TemplateVariableUnknownException for an unknown variable name', () => {
    expect(() => resolver.resolve(['notARealVariable'], { lead: completeLead })).toThrowError(
      TemplateVariableUnknownException,
    )
  })

  it('throws TemplateVariableUnresolvedException when leadPhone is null', () => {
    expect(() =>
      resolver.resolve(['leadPhone'], {
        lead: { ...completeLead, phone: null },
      }),
    ).toThrowError(TemplateVariableUnresolvedException)
  })

  it('throws TemplateVariableUnresolvedException when ownerExternalId is null', () => {
    expect(() =>
      resolver.resolve(['ownerExternalId'], {
        lead: { ...completeLead, ownerExternalId: null },
      }),
    ).toThrowError(TemplateVariableUnresolvedException)
  })

  it('throws TemplateVariableUnresolvedException when leadFirstName has only whitespace', () => {
    expect(() =>
      resolver.resolve(['leadFirstName'], {
        lead: { ...completeLead, name: '   ' },
      }),
    ).toThrowError(TemplateVariableUnresolvedException)
  })

  it('carries the variable name on the thrown exception (for downstream reason logging)', () => {
    expect.assertions(2)
    try {
      resolver.resolve(['leadPhone'], { lead: { ...completeLead, phone: null } })
    } catch (error) {
      expect(error).toBeInstanceOf(TemplateVariableUnresolvedException)
      expect((error as TemplateVariableUnresolvedException).variableName).toBe('leadPhone')
    }
  })
})
