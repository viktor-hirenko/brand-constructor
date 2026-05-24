import {
  readSelectionAsArray,
  readSelectionAsString,
} from '@/stores/constructor/selectionHelpers'

export type CeoLibraryTab = 'concept' | 'externalNaming' | 'internalNaming'

export const CEO_LIBRARY_KEYS: CeoLibraryTab[] = [
  'concept',
  'externalNaming',
  'internalNaming',
]

export const ATTENTION_SECTION_KEYS = [
  'basics',
  'concept',
  'externalNaming',
  'internalNaming',
  'marketingPackage',
  'deliverables',
  'visualComponents',
] as const

export type AttentionSectionKey = (typeof ATTENTION_SECTION_KEYS)[number]

export interface PoLibrarySelections {
  conceptId: string | null
  externalIds: string[]
  internalId: string | null
}

export interface CeoCommentMeta {
  value: string
  resolved?: boolean
}

export interface CeoRevisionGateInput {
  comments: Record<string, CeoCommentMeta> | null | undefined
  ceoSelections: Record<string, string | string[] | undefined> | null | undefined
  poSelections: PoLibrarySelections
}

function isLibraryKey(key: string): key is CeoLibraryTab {
  return CEO_LIBRARY_KEYS.includes(key as CeoLibraryTab)
}

/** True when CEO pick for `key` differs from PO current selection. */
export function isCeoChoiceAnAlternative(
  key: CeoLibraryTab,
  ceoValue: string | string[],
  po: PoLibrarySelections
): boolean {
  if (key === 'concept') {
    const ceoId = readSelectionAsString(ceoValue)
    if (!ceoId) return false
    return !po.conceptId || ceoId !== po.conceptId
  }
  if (key === 'externalNaming') {
    const ceoIds = readSelectionAsArray(ceoValue)
    if (ceoIds.length === 0) return false
    if (po.externalIds.length !== ceoIds.length) return true
    return ceoIds.some(id => !po.externalIds.includes(id))
  }
  const ceoId = readSelectionAsString(ceoValue)
  if (!ceoId) return false
  return !po.internalId || ceoId !== po.internalId
}

/** Sections with unresolved CEO comments or undecided CEO alternatives. */
export function countSectionsNeedingAttention(input: CeoRevisionGateInput): number {
  let count = 0
  for (const key of ATTENTION_SECTION_KEYS) {
    const meta = input.comments?.[key]
    const hasUnresolvedComment = !!meta && meta.value.trim().length > 0 && !meta.resolved
    const selectionValue = input.ceoSelections?.[key]
    const hasUndecidedAlternative =
      isLibraryKey(key) &&
      selectionValue != null &&
      isCeoChoiceAnAlternative(key, selectionValue, input.poSelections)
    if (hasUnresolvedComment || hasUndecidedAlternative) count++
  }
  return count
}

export function isSubmitBlockedForReturnedView(input: CeoRevisionGateInput): boolean {
  return countSectionsNeedingAttention(input) > 0
}
