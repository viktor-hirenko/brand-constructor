/**
 * Rules of a brief «В роботі» (`in_work`) on the author's Final review —
 * brief-orders plan, phase 1. Kept out of the components so tests can hold
 * them; the server enforces the same (`checkInWorkEdit`, `validateBriefCompleteness`).
 */

export type AuthorReviewMode =
  | 'ceo'
  | 'po-draft'
  | 'po-returned'
  | 'po-submitted'
  | 'po-in-work'
  | 'approved'

/** The teams already have the brief; only what was ordered may be swapped. */
export const IN_WORK_EDITABLE_SECTIONS: ReadonlySet<string> = new Set([
  'concept',
  'externalNaming',
  'internalNaming',
])

export function isSectionEditableInMode(
  mode: AuthorReviewMode,
  sectionKey: string,
  opts: { conceptOrdered?: boolean } = {}
): boolean {
  if (mode === 'ceo' || mode === 'po-submitted' || mode === 'approved') return false
  // A new concept is ordered: its brief already carries the naming wishes and
  // the wizard skips External Naming (v2-prd:151-152). Names exist only per
  // concept, so with no concept the list would offer every concept's names.
  // The names are picked once a library concept is chosen (Concept → Редагувати).
  if (sectionKey === 'externalNaming' && opts.conceptOrdered) return false
  if (mode === 'po-in-work') return IN_WORK_EDITABLE_SECTIONS.has(sectionKey)
  return true
}

export interface InWorkReadiness {
  hasNewBrief: boolean
  hasConcept: boolean
  externalCount: number
  hasInternal: boolean
}

/** «На погодження CEO» waits until nothing is on order and the brief is whole (H-01, H-02). */
export function isInWorkReadyForCeo(r: InWorkReadiness): boolean {
  return !r.hasNewBrief && r.hasConcept && r.externalCount > 0 && r.hasInternal
}

/** A draft with an order goes to the teams; everything else the author sends goes to the CEO. */
export function authorSubmitTarget(
  mode: AuthorReviewMode,
  hasNewBrief: boolean
): 'in_work' | 'submitted' {
  return mode === 'po-draft' && hasNewBrief ? 'in_work' : 'submitted'
}

/**
 * The draft edit-flow (`/draft-edit/*`) is open to the author of a `draft` or
 * `in_work` brief — by STATUS: picking a library concept clears the order in
 * the store, and an order-based check threw the author out mid-edit (H-01).
 */
export function canEnterDraftEdit(opts: { isCeo: boolean; brandStatus: string | null }): boolean {
  if (opts.isCeo) return false
  return opts.brandStatus === 'draft' || opts.brandStatus === 'in_work'
}
