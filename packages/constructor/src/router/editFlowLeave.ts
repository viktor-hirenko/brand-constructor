export interface EditFlowLeaveInput {
  fromName: string | symbol | null | undefined
  /** `from.meta.poEdit || from.meta.draftEdit` — the Author's edit screens. */
  fromIsEditScreen: boolean
  toName: string | symbol | null | undefined
  toIsEditScreen: boolean
  /** `store.editingSection` — non-null while an edit opened from the review is not saved. */
  editingSection: string | null
}

/**
 * What a navigation does to an edit the Author opened from the review and has
 * not saved.
 *
 *  - `discard` — leaving the edit screens for anything else: the edit is
 *    dropped, as «Скасувати» drops it. Before 05.10 only the buttons did this;
 *    «назад» of the browser left the half-done edit in the brief, and the review
 *    showed a new concept with no names and an open «На погодження CEO»
 *    (H-02, D-12) or a concept the server did not have (H-03, D-13).
 *  - `step-back` — revision, from the names screen of a concept change back to
 *    the concept screen: what «Назад» on the names screen does.
 *  - `null` — nothing to do: no unsaved edit (the buttons already saved or
 *    dropped it), or the move stays inside the edit screens.
 */
export function editFlowLeaveAction(input: EditFlowLeaveInput): 'discard' | 'step-back' | null {
  if (!input.editingSection || !input.fromIsEditScreen) return null
  if (input.fromName === 'po-edit-concept-external-naming' && input.toName === 'po-edit-concept') {
    return 'step-back'
  }
  if (input.toIsEditScreen) return null
  return 'discard'
}
