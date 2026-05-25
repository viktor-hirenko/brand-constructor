/**
 * Pure helpers for normalising CEO selection values. A single CEO pick is
 * stored as `string`, an external-naming pick as `string[]`. Both shapes
 * coexist in `brandCeoSelections` because the legacy schema accepted either,
 * and several call sites have to defensively read whichever variant was
 * persisted. Extracted as a shared util so `useSupervisorReview` and
 * `useSupervisorAlternativeDraft` can read selections without duplicating the
 * normalisation logic.
 */

export function readSelectionAsString(value: string | string[] | undefined): string | null {
  if (typeof value === 'string') return value || null
  if (Array.isArray(value)) return value[0] ?? null
  return null
}

export function readSelectionAsArray(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) return value
  if (typeof value === 'string' && value) return [value]
  return []
}
