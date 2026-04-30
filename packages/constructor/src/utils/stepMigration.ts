/**
 * Maps saved `currentStep` from the legacy 10-step flow to the 9-step flow.
 * When `stepLayoutVersion === 1` in stepData, the step is already in the new scheme.
 */
export function migrateIncomingCurrentStep(
  rawStep: number,
  layoutVersion: number | undefined
): number {
  const clamp9 = (n: number) => Math.min(9, Math.max(1, n))
  if (layoutVersion === 1) {
    return clamp9(rawStep)
  }
  if (!Number.isFinite(rawStep) || rawStep < 1) return 1
  if (rawStep === 2) return 1
  if (rawStep >= 3 && rawStep <= 10) return clamp9(rawStep - 1)
  return clamp9(rawStep)
}

/** Old bookmarked paths /constructor/step/3 … /step/10 */
export function redirectLegacyStepPath(path: string): { path: string; replace: boolean } | null {
  const m = path.match(/\/constructor\/step\/(\d+)/)
  if (!m) return null
  const n = parseInt(m[1], 10)
  if (n >= 3 && n <= 10) {
    return { path: `/constructor/step/${n - 1}`, replace: true }
  }
  return null
}
