/**
 * Maps saved `currentStep` from older flows to the current 8-step flow.
 *
 * Layout history:
 *   - legacy (no version): 10-step flow with separate Mode (step 2) and Brand Preview (step 6).
 *   - v1: 9-step flow after Mode was merged into Concept Selection (Brand Preview at step 5).
 *   - v2 (current): 8-step flow after Brand Preview step was removed.
 */
export function migrateIncomingCurrentStep(
  rawStep: number,
  layoutVersion: number | undefined
): number {
  const clamp8 = (n: number) => Math.min(8, Math.max(1, n))
  if (!Number.isFinite(rawStep) || rawStep < 1) return 1

  if (layoutVersion === 2) {
    return clamp8(rawStep)
  }

  if (layoutVersion === 1) {
    // v1 → v2: Brand Preview (step 5) removed; everything from step 6 shifts down by one.
    if (rawStep >= 6) return clamp8(rawStep - 1)
    return clamp8(rawStep)
  }

  // Legacy 10-step → v2: first migrate to v1 (subtract 1 for steps ≥ 3), then v1 → v2.
  if (rawStep === 2) return 1
  if (rawStep >= 3 && rawStep <= 10) {
    const v1 = rawStep - 1
    if (v1 >= 6) return clamp8(v1 - 1)
    return clamp8(v1)
  }
  return clamp8(rawStep)
}

/**
 * Old bookmarked paths that pre-date the current 8-step flow.
 *
 * Handles both legacy 10-step and v1 9-step URLs in a single pass.
 * Vue Router invokes this only on first entry to `/constructor`, so internal
 * step-to-step navigation does not retrigger and is unaffected.
 */
export function redirectLegacyStepPath(path: string): { path: string; replace: boolean } | null {
  const m = path.match(/\/constructor\/step\/(\d+)/)
  if (!m) return null
  const n = parseInt(m[1], 10)
  if (n >= 3 && n <= 10) {
    const v1 = n - 1
    const v2 = v1 >= 6 ? v1 - 1 : v1
    return { path: `/constructor/step/${v2}`, replace: true }
  }
  return null
}
