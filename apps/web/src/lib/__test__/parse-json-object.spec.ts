import { parseJsonObject } from '@kizunu/web/lib/parse-json-object'
import { describe, expect, it } from 'vite-plus/test'

describe('parseJsonObject', () => {
  it('parses a JSON object into a record', () => {
    expect(parseJsonObject('{"waba_id":"123","phone_number_id":"456"}')).toEqual({
      waba_id: '123',
      phone_number_id: '456',
    })
  })

  it('returns null for malformed JSON', () => {
    expect(parseJsonObject('{ not json')).toBeNull()
  })

  it('returns null for a JSON array, which is not an object payload', () => {
    expect(parseJsonObject('[1, 2, 3]')).toBeNull()
  })

  it('returns null for the JSON literal null', () => {
    expect(parseJsonObject('null')).toBeNull()
  })

  it('returns null for a JSON primitive', () => {
    expect(parseJsonObject('42')).toBeNull()
  })

  it('parses an empty object', () => {
    expect(parseJsonObject('{}')).toEqual({})
  })
})
