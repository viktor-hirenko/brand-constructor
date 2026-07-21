import type { Brand, BrandStepData } from '../types/brand'

export interface BrandHasNewBriefsInput {
  newConceptBrief?: unknown | null
  newNamingBrief?: unknown | null
  stepData?: BrandStepData | null
}

function hasInternalNamingFeedback(stepData: BrandStepData | null | undefined): boolean {
  const feedback = stepData?.internalNaming?.newNamingFeedback?.trim()
  return Boolean(feedback)
}

/** True when the PO ordered a new concept, external naming, or internal naming brief. */
export function brandHasNewBriefs(input: BrandHasNewBriefsInput): boolean {
  if (input.newConceptBrief != null || input.newNamingBrief != null) return true
  return hasInternalNamingFeedback(input.stepData ?? null)
}

/** Convenience wrapper for API `Brand` / admin list rows. */
export function brandHasNewBriefsFromBrand(
  brand: Pick<Brand, 'newConceptBrief' | 'newNamingBrief' | 'stepData'>
): boolean {
  return brandHasNewBriefs({
    newConceptBrief: brand.newConceptBrief,
    newNamingBrief: brand.newNamingBrief,
    stepData: brand.stepData,
  })
}

/** Worker D1 row shape (`snake_case` columns). */
export function brandHasNewBriefsFromRow(row: {
  new_concept_brief?: string | null
  new_naming_brief?: string | null
  step_data?: string | null
}): boolean {
  if (row.new_concept_brief != null || row.new_naming_brief != null) return true
  if (!row.step_data) return false
  try {
    const stepData = JSON.parse(row.step_data) as BrandStepData
    return hasInternalNamingFeedback(stepData)
  } catch {
    return false
  }
}
