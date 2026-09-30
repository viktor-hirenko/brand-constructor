/**
 * Label next to the concept name in the right panel of the concept-edit
 * screens reached from step 8.
 *
 * Two different situations share that screen, and they must not share words:
 *
 *  - `draft` — the brief has not been sent yet; the author is just changing a
 *    pick on Final review. `5387:99707` (section `5387:99050`) draws the kit
 *    badge «Обраний концепт» on the ticked concept, exactly like step 2.
 *    Owner 29.09: «там не может быть "ваш предыдущий выбор" — это только при
 *    согласовании между Product Owner и CEO».
 *  - `revision` — the brief came back from the CEO; the author compares their
 *    earlier pick with the CEO's, hence «Ваш попередній вибір» / «Вибір CEO».
 */
export type ConceptEditMode = 'draft' | 'revision'

export const CHOSEN_CONCEPT_LABEL = 'Обраний концепт'
export const PREVIOUS_CHOICE_LABEL = 'Ваш попередній вибір'
export const CEO_CHOICE_LABEL = 'Вибір CEO'

export interface ConceptEditSliderLabelInput {
  mode: ConceptEditMode
  /** Concept shown in the slider; null until the author browses one. */
  previewId: string | null
  /** Concept ticked in the grid. */
  selectedId: string | null
  /** Concept the CEO chose (revision only). */
  ceoConceptId: string | null
}

export function conceptEditSliderLabel(input: ConceptEditSliderLabelInput): string | null {
  const { mode, previewId, selectedId, ceoConceptId } = input
  if (mode === 'draft') {
    // The slider falls back to the ticked concept when nothing is browsed.
    const shownId = previewId ?? selectedId
    return shownId !== null && shownId === selectedId ? CHOSEN_CONCEPT_LABEL : null
  }
  // Revision — unchanged behaviour.
  if (!previewId) return null
  if (previewId === ceoConceptId) return CEO_CHOICE_LABEL
  if (previewId === selectedId) return PREVIOUS_CHOICE_LABEL
  return null
}
