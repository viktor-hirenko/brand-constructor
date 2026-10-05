import type { BrandStepData } from '@brand-constructor/shared/types'

/**
 * A library concept with no External Naming and no order for one — the brief
 * the server of the orders feature refuses as «Бриф неповний: оберіть хоча б
 * один External Naming.» (`W/utils/brief-checks.ts` there). On this branch the
 * server takes it, so the Final review keeps «На погодження CEO» shut instead
 * (H-02, run 02.10: D-12 — a concept changed from the review, the names screen
 * left by «назад», and the button was on).
 *
 * An ordered concept carries no names by design: they come with the order.
 */
export function isExternalNamingMissing(stepData: BrandStepData): boolean {
  if (stepData.concept.newConceptBrief) return false
  if (!stepData.concept.selectedId) return false
  if (stepData.externalNaming.newNamingBrief) return false
  return (stepData.externalNaming.selectedIds ?? []).length === 0
}
