import {
  readSelectionAsArray,
  readSelectionAsString,
} from '@/stores/constructor/selectionHelpers'

export type SupervisorLibraryTab = 'concept' | 'externalNaming' | 'internalNaming'

export const SUPERVISOR_LIBRARY_KEYS: SupervisorLibraryTab[] = [
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

export interface AuthorLibrarySelections {
  conceptId: string | null
  externalIds: string[]
  internalId: string | null
}

export interface CeoCommentMeta {
  value: string
  resolved?: boolean
}

export interface SupervisorRevisionGateInput {
  comments: Record<string, CeoCommentMeta> | null | undefined
  ceoSelections: Record<string, string | string[] | undefined> | null | undefined
  authorSelections: AuthorLibrarySelections
}

function isLibraryKey(key: string): key is SupervisorLibraryTab {
  return SUPERVISOR_LIBRARY_KEYS.includes(key as SupervisorLibraryTab)
}

/** True when CEO pick for `key` differs from PO current selection. */
export function isSupervisorChoiceAnAlternative(
  key: SupervisorLibraryTab,
  ceoValue: string | string[],
  po: AuthorLibrarySelections
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
export function countSectionsNeedingAttention(input: SupervisorRevisionGateInput): number {
  let count = 0
  for (const key of ATTENTION_SECTION_KEYS) {
    const meta = input.comments?.[key]
    const hasUnresolvedComment = !!meta && meta.value.trim().length > 0 && !meta.resolved
    const selectionValue = input.ceoSelections?.[key]
    const hasUndecidedAlternative =
      isLibraryKey(key) &&
      selectionValue != null &&
      isSupervisorChoiceAnAlternative(key, selectionValue, input.authorSelections)
    if (hasUnresolvedComment || hasUndecidedAlternative) count++
  }
  return count
}

export function isSubmitBlockedForReturnedView(input: SupervisorRevisionGateInput): boolean {
  return countSectionsNeedingAttention(input) > 0
}
