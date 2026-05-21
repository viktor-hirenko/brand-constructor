import { ref, type Ref } from 'vue'
import { readSelectionAsString, readSelectionAsArray } from './selectionHelpers'
import type { BrandStepData } from '@brand-constructor/shared/types'

export type CeoReselectSection = 'concept' | 'externalNaming' | 'internalNaming'

export interface CeoReselectDraft {
  /** Confirmed CEO concept override (null = no override, slider stays on PO concept). */
  conceptId: string | null
  /** What the slider currently shows (independent of confirmation). */
  conceptPreviewId: string | null
  externalNamingIds: string[]
  internalNamingId: string | null
}

export const CEO_RESELECT_EXTERNAL_NAMING_LIMIT = 3

interface UseCeoReselectDraftOptions {
  /** Wizard step-data from `useBrandData` — `seedCeoReselectFromBrand` falls back to PO picks. */
  stepData: Ref<BrandStepData>
  /** Saved CEO picks from `useCeoReview` — preferred source for seeding the draft. */
  brandCeoSelections: Ref<Record<string, string | string[]> | null>
}

/**
 * Transient state for the dedicated CEO re-select routes (`/ceo-reselect/*`).
 *
 * Owns:
 *  - `ceoReselectDraft` — staged CEO picks before "Зберегти" persists them
 *    via `useCeoReview.saveCeoSelections`
 *  - per-field setters used by the three CEO re-select step views
 *  - `seedCeoReselectFromBrand` — prefill draft from saved CEO picks, falling
 *    back to PO `stepData` for the matching section
 *  - `seedCeoReselectExternalNamingChained` — chained-mode helper that clears
 *    external naming picks after a concept change (the old external set
 *    belonged to the previous concept and is no longer valid)
 *
 * Stays transient — nothing here is persisted to the server until the CEO
 * confirms via `saveCeoSelections` in the parent view.
 */
export function useCeoReselectDraft(opts: UseCeoReselectDraftOptions) {
  const { stepData, brandCeoSelections } = opts

  const ceoReselectDraft = ref<CeoReselectDraft>({
    conceptId: null,
    conceptPreviewId: null,
    externalNamingIds: [],
    internalNamingId: null,
  })

  function resetCeoReselectDraft() {
    ceoReselectDraft.value = {
      conceptId: null,
      conceptPreviewId: null,
      externalNamingIds: [],
      internalNamingId: null,
    }
  }

  /** Confirmed CEO concept override. Pass `null` to clear (= keep PO concept). */
  function setCeoReselectConcept(id: string | null) {
    ceoReselectDraft.value = { ...ceoReselectDraft.value, conceptId: id }
  }

  /** Currently previewed concept in slider (independent of confirmation). */
  function setCeoReselectConceptPreview(id: string | null) {
    ceoReselectDraft.value = { ...ceoReselectDraft.value, conceptPreviewId: id }
  }

  /** Toggles an external naming id in/out of the staged set, with limit 3. */
  function toggleCeoReselectExternalNaming(id: string): boolean {
    const current = [...ceoReselectDraft.value.externalNamingIds]
    const idx = current.indexOf(id)
    if (idx >= 0) {
      current.splice(idx, 1)
    } else {
      if (current.length >= CEO_RESELECT_EXTERNAL_NAMING_LIMIT) return false
      current.push(id)
    }
    ceoReselectDraft.value = { ...ceoReselectDraft.value, externalNamingIds: current }
    return true
  }

  function setCeoReselectExternalNamingIds(ids: string[]) {
    ceoReselectDraft.value = {
      ...ceoReselectDraft.value,
      externalNamingIds: ids.slice(0, CEO_RESELECT_EXTERNAL_NAMING_LIMIT),
    }
  }

  function setCeoReselectInternalNaming(id: string | null) {
    ceoReselectDraft.value = { ...ceoReselectDraft.value, internalNamingId: id }
  }

  /**
   * Prefill draft from saved CEO picks, else PO `stepData`, for the given
   * re-select entry point.
   */
  function seedCeoReselectFromBrand(section: CeoReselectSection) {
    const sel = brandCeoSelections.value
    const sd = stepData.value
    resetCeoReselectDraft()
    if (section === 'concept') {
      const ceoConcept = readSelectionAsString(sel?.concept)
      ceoReselectDraft.value.conceptId = ceoConcept
      ceoReselectDraft.value.conceptPreviewId = ceoConcept ?? sd.concept.selectedId
    } else if (section === 'externalNaming') {
      ceoReselectDraft.value.conceptId =
        readSelectionAsString(sel?.concept) ?? sd.concept.selectedId
      const saved = readSelectionAsArray(sel?.externalNaming)
      ceoReselectDraft.value.externalNamingIds =
        saved.length > 0
          ? saved
          : sd.externalNaming.selectedIds.slice(0, CEO_RESELECT_EXTERNAL_NAMING_LIMIT)
    } else {
      ceoReselectDraft.value.internalNamingId =
        readSelectionAsString(sel?.internalNaming) ?? sd.internalNaming.selectedId ?? null
    }
  }

  /**
   * Preserves `conceptId` in draft (after concept step) and starts external
   * naming pick fresh.
   *
   * In chained mode the CEO has just chosen a different concept, so any prior
   * external naming selections (PO's or previously saved CEO's) belong to the
   * OLD concept and are irrelevant. Starting empty forces the CEO to make a
   * new decision against the new concept's naming set.
   */
  function seedCeoReselectExternalNamingChained() {
    ceoReselectDraft.value = {
      ...ceoReselectDraft.value,
      externalNamingIds: [],
    }
  }

  function resetSlice() {
    resetCeoReselectDraft()
  }

  return {
    ceoReselectDraft,
    resetCeoReselectDraft,
    setCeoReselectConcept,
    setCeoReselectConceptPreview,
    toggleCeoReselectExternalNaming,
    setCeoReselectExternalNamingIds,
    setCeoReselectInternalNaming,
    seedCeoReselectFromBrand,
    seedCeoReselectExternalNamingChained,
    // Facade-internal
    resetSlice,
  }
}

export type UseCeoReselectDraftReturn = ReturnType<typeof useCeoReselectDraft>
