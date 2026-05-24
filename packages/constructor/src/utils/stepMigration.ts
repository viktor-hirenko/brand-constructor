/**
 * Clamps a saved `currentStep` to the valid range for the current 8-step flow.
 * The `layoutVersion` parameter is kept in the signature for forward-compatibility
 * in case steps are restructured again in the future.
 */
export function migrateIncomingCurrentStep(
  rawStep: number,
  _layoutVersion?: number
): number {
  if (!Number.isFinite(rawStep) || rawStep < 1) return 1
  return Math.min(8, Math.max(1, rawStep))
}

