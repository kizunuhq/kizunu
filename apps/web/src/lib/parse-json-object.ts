function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Parses a JSON object string (e.g. credentials), returning `null` for invalid JSON
 * or any non-object payload — so forms can validate without try/catch at the call site. */
export function parseJsonObject(raw: string): Record<string, unknown> | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  return isRecord(parsed) ? parsed : null
}
