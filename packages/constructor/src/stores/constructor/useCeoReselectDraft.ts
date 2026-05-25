import { ref, watch, type Ref } from 'vue'
import { readSelectionAsString, readSelectionAsArray } from './selectionHelpers'
import type { BrandStepData } from '@brand-constructor/shared/types'
import {
  writeSupervisorReselectDraft,
  readSupervisorReselectDraft,
  clearSupervisorReselectDraft,
} from '@/domain/persistence/briefDraftStorage'
import { logSilent } from '@/utils/log'

function debounce<T extends (...args: Parameters<T>) => void>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout> | undefined
  return ((...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }) as T
}

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
  /** Brand id from `useBrandData` — used to scope the localStorage cache key. */
  brandId: Ref<string | null>
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
  const { stepData, brandCeoSelections, brandId } = opts

  const ceoReselectDraft = ref<CeoReselectDraft>({
    conceptId: null,
    conceptPreviewId: null,
    externalNamingIds: [],
    internalNamingId: null,
  })

  /**
   * True while the CEO has made at least one un-saved change in the current
   * reselect session. Used by the `seed*` functions to AVOID overwriting an
   * in-progress draft when the CEO navigates back and re-mounts a view.
   * Cleared on save / reset / explicit clear.
   */
  const ceoReselectDraftInProgress = ref(false)

  // ─── F5-safe localStorage persistence ─────────────────────────────────────

  const _writeDraftDebounced = debounce((id: string, draft: CeoReselectDraft) => {
    writeSupervisorReselectDraft(id, draft)
  }, 400)

  watch(
    ceoReselectDraft,
    draft => {
      const id = brandId.value
      if (!id || !ceoReselectDraftInProgress.value) return
      _writeDraftDebounced(id, draft)
    },
    { deep: true }
  )

  /**
   * Called from the parent route guard after `store.loadBrand()` to overlay
   * any cached in-progress picks over the freshly loaded store state.
   */
  function restoreCeoReselectDraftFromStorage(briefId: string) {
    try {
      const envelope = readSupervisorReselectDraft(briefId)
      if (!envelope) return
      ceoReselectDraft.value = { ...envelope.draft }
      ceoReselectDraftInProgress.value = true
    } catch (err) {
      logSilent('useCeoReselectDraft/restore', err)
    }
  }

  function resetCeoReselectDraft() {
    const id = brandId.value
    if (id) clearSupervisorReselectDraft(id)
    ceoReselectDraft.value = {
      conceptId: null,
      conceptPreviewId: null,
      externalNamingIds: [],
      internalNamingId: null,
    }
    ceoReselectDraftInProgress.value = false
  }

  /** Confirmed CEO concept override. Pass `null` to clear (= keep PO concept). */
  function setCeoReselectConcept(id: string | null) {
    ceoReselectDraft.value = { ...ceoReselectDraft.value, conceptId: id }
    ceoReselectDraftInProgress.value = true
  }

  /** Currently previewed concept in slider (independent of confirmation). */
  function setCeoReselectConceptPreview(id: string | null) {
    ceoReselectDraft.value = { ...ceoReselectDraft.value, conceptPreviewId: id }
  }

  /**
   * Atomic single-click selection: confirms a CEO override and syncs the
   * slider preview to it in one update. Pass `id = null` to clear the
   * override and revert the preview to `fallbackPreviewId` (usually the PO
   * concept id).
   *
   * If the CEO switches to a DIFFERENT concept than was previously selected
   * in the draft, the external naming picks are cleared — they belonged to
   * the old concept and are no longer valid.
   */
  function selectCeoReselectConcept(id: string | null, fallbackPreviewId: string | null) {
    const prevConceptId = ceoReselectDraft.value.conceptId
    const conceptChanged = prevConceptId !== id
    ceoReselectDraft.value = {
      ...ceoReselectDraft.value,
      conceptId: id,
      conceptPreviewId: id ?? fallbackPreviewId,
      externalNamingIds: conceptChanged ? [] : ceoReselectDraft.value.externalNamingIds,
    }
    ceoReselectDraftInProgress.value = true
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
    ceoReselectDraftInProgress.value = true
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
    ceoReselectDraftInProgress.value = true
  }

  /**
   * Prefill draft from saved CEO picks, else PO `stepData`, for the given
   * re-select entry point.
   *
   * If the CEO already has in-progress (un-saved) changes in the draft,
   * the seed is skipped — otherwise navigating back to a previous step would
   * silently discard those changes (e.g. "Назад" from external naming would
   * reset the just-picked concept on the concept screen).
   */
  function seedCeoReselectFromBrand(section: CeoReselectSection) {
    if (ceoReselectDraftInProgress.value) return
    const sel = brandCeoSelections.value
    const sd = stepData.value
    resetCeoReselectDraft()
    if (section === 'concept') {
      const ceoConcept = readSelectionAsString(sel?.concept)
      ceoReselectDraft.value.conceptId = ceoConcept
      // Right-panel preview is shown only for a real CEO override (variant A):
      //  - saved CEO concept → restore it
      //  - no saved CEO concept yet → null (empty right panel until first click)
      // Do NOT fall back to the PO pick — that would mislabel PO's concept as "Вибір СЕО".
      ceoReselectDraft.value.conceptPreviewId = ceoConcept
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
   * Preserves `conceptId` in draft (after concept step) and seeds external
   * naming pick.
   *
   * Skip when the user has already touched the external naming selection in
   * the current session — re-mounting after "Назад" must NOT discard their
   * in-progress picks.
   *
   * Otherwise: if the CEO chose the SAME concept as their last saved pick,
   * restore previously saved external naming IDs. If the concept changed,
   * start fresh — old picks belonged to the old concept.
   */
  function seedCeoReselectExternalNamingChained() {
    if (ceoReselectDraft.value.externalNamingIds.length > 0) return

    const savedConceptId = readSelectionAsString(brandCeoSelections.value?.concept)
    const savedExternalIds = readSelectionAsArray(brandCeoSelections.value?.externalNaming)
    const currentConceptId = ceoReselectDraft.value.conceptId

    const externalNamingIds =
      currentConceptId &&
      currentConceptId === savedConceptId &&
      savedExternalIds.length > 0
        ? savedExternalIds.slice(0, CEO_RESELECT_EXTERNAL_NAMING_LIMIT)
        : []

    ceoReselectDraft.value = {
      ...ceoReselectDraft.value,
      externalNamingIds,
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
    selectCeoReselectConcept,
    toggleCeoReselectExternalNaming,
    setCeoReselectExternalNamingIds,
    setCeoReselectInternalNaming,
    seedCeoReselectFromBrand,
    seedCeoReselectExternalNamingChained,
    restoreCeoReselectDraftFromStorage,
    // Facade-internal
    resetSlice,
  }
}

export type UseCeoReselectDraftReturn = ReturnType<typeof useCeoReselectDraft>
