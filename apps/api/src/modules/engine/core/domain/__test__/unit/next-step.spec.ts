import { resolveNextStep } from '@kizunu/api/modules/engine/core/domain/next-step'
import { describe, expect, it } from 'vite-plus/test'

describe('resolveNextStep', () => {
  it('dispatches the first step before any has run', () => {
    expect(resolveNextStep(-1, 3)).toEqual({ kind: 'dispatch', stepOrder: 0 })
  })

  it('dispatches the step after the current one', () => {
    expect(resolveNextStep(0, 3)).toEqual({ kind: 'dispatch', stepOrder: 1 })
  })

  it('exhausts once the last step has run', () => {
    expect(resolveNextStep(2, 3)).toEqual({ kind: 'exhausted' })
  })

  it('exhausts an empty cadence at the boundary', () => {
    expect(resolveNextStep(-1, 0)).toEqual({ kind: 'exhausted' })
  })
})
