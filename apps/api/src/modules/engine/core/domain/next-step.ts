export type NextStep = { kind: 'dispatch'; stepOrder: number } | { kind: 'exhausted' }

/**
 * Decides what the dispatcher does next for a journey: send the step after the current
 * one, or — when there is none left — exhaust the journey. Pure.
 */
export function resolveNextStep(currentStepOrder: number, stepCount: number): NextStep {
  const nextStepOrder = currentStepOrder + 1
  if (nextStepOrder >= stepCount) return { kind: 'exhausted' }
  return { kind: 'dispatch', stepOrder: nextStepOrder }
}
