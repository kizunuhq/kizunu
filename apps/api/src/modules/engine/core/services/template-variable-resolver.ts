import { Injectable } from '@nestjs/common'

import {
  TemplateVariableUnknownException,
  TemplateVariableUnresolvedException,
} from '../errors/template-variable.errors'

export interface LeadVariableContext {
  name: string
  phone: string | null
  ownerExternalId: string | null
}

type Mapper = (lead: LeadVariableContext) => string | null

function firstToken(name: string): string | null {
  const trimmed = name.trim()
  if (trimmed.length === 0) return null
  const space = trimmed.indexOf(' ')
  return space === -1 ? trimmed : trimmed.slice(0, space)
}

const MAPPERS: Record<string, Mapper> = {
  leadFirstName: (lead) => firstToken(lead.name),
  leadName: (lead) => (lead.name.trim().length === 0 ? null : lead.name),
  leadPhone: (lead) => lead.phone,
  ownerExternalId: (lead) => lead.ownerExternalId,
}

@Injectable()
export class TemplateVariableResolver {
  resolve(
    variables: readonly string[],
    context: { lead: LeadVariableContext },
  ): Record<string, string> {
    const resolved: Record<string, string> = {}
    for (const name of variables) {
      if (resolved[name] !== undefined) continue
      const mapper = MAPPERS[name]
      if (!mapper) throw new TemplateVariableUnknownException(name)
      const value = mapper(context.lead)
      if (value === null || value.length === 0) {
        throw new TemplateVariableUnresolvedException(name)
      }
      resolved[name] = value
    }
    return resolved
  }
}
