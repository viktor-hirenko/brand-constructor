import type { BrandStepData } from '@brand-constructor/shared/types'

type CeoSelections = Record<string, string | string[]> | null | undefined

/**
 * The CEO's alternative of one section as a stable string: a list of names is
 * the same answer in any order.
 */
export function ownVariantKey(value: string | string[] | null | undefined): string {
  if (value == null) return ''
  return Array.isArray(value) ? JSON.stringify([...value].sort()) : JSON.stringify(value)
}

/**
 * «Свій варіант»: the author kept a choice of their own in `section` over the
 * CEO's alternative there. Written into the brief's step data, so it is saved
 * with the brief — until 05.10 it lived in one browser for 24 hours, and on
 * another computer or the next day the section asked for a choice again and
 * held «На погодження CEO» shut (D-33, E-27 of `edit-flow-scenarios.md`).
 */
export function keepOwnVariant(
  stepData: BrandStepData,
  section: string,
  ceoSelections: CeoSelections
): void {
  stepData.revisionKeptOwn = {
    ...(stepData.revisionKeptOwn ?? {}),
    [section]: ownVariantKey(ceoSelections?.[section]),
  }
}

export function forgetOwnVariant(stepData: BrandStepData, sections: string[]): void {
  if (!stepData.revisionKeptOwn) return
  const next = { ...stepData.revisionKeptOwn }
  for (const section of sections) delete next[section]
  stepData.revisionKeptOwn = Object.keys(next).length > 0 ? next : undefined
}

/**
 * Holds only for the CEO alternative it answered: a CEO who offers something
 * else asks a new question (R-14 of `edit-flow-scenarios.md`).
 */
export function isOwnVariantKept(
  stepData: BrandStepData,
  section: string,
  ceoSelections: CeoSelections
): boolean {
  const kept = stepData.revisionKeptOwn?.[section]
  return kept !== undefined && kept === ownVariantKey(ceoSelections?.[section])
}
