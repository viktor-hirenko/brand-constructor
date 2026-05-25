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

export type SupervisorReselectSection = 'concept' | 'externalNaming' | 'internalNaming'

export interface SupervisorReselectDraft {
  /** Confirmed Supervisor concept override (null = no override, slider stays on Author concept). */
  conceptId: string | null
  /** What the slider currently shows (independent of confirmation). */
  conceptPreviewId: string | null
  externalNamingIds: string[]
  internalNamingId: string | null
}

export const SUPERVISOR_RESELECT_EXTERNAL_NAMING_LIMIT = 3

interface UseSupervisorReselectDraftOptions {
  /** Wizard step-data from `useBrandData` — `seedFromBrand` falls back to Author picks. */
  stepData: Ref<BrandStepData>
  /** Saved Supervisor picks from `useCeoReview` — preferred source for seeding the draft. */
  brandCeoSelections: Ref<Record<string, string | string[]> | null>
  /** Brand id from `useBrandData` — used to scope the localStorage cache key. */
  brandId: Ref<string | null>
}

/**
 * Transient state for the dedicated Supervisor re-select routes
 * (`/ceo-reselect/*` — the URL fragment is kept for backward-compat; the
 * domain meaning is "Supervisor proposes an alternative for the Author").
 *
 * Owns:
 *  - `supervisorReselectDraft` — staged Supervisor picks before "Зберегти"
 *    persists them via `useCeoReview.saveCeoSelections`
 *  - per-field setters used by the three Supervisor re-select step views
 *  - `seedSupervisorReselectFromBrand` — prefill draft from saved Supervisor
 *    picks, falling back to Author `stepData` for the matching section
 *  - `seedSupervisorReselectExternalNamingChained` — chained-mode helper
 *    that clears external naming picks after a concept change (the old
 *    external set belonged to the previous concept and is no longer valid)
 *
 * Stays transient — nothing here is persisted to the server until the
 * Supervisor confirms via `saveCeoSelections` in the parent view.
 */
export function useSupervisorReselectDraft(opts: UseSupervisorReselectDraftOptions) {
  const { stepData, brandCeoSelections, brandId } = opts

  const supervisorReselectDraft = ref<SupervisorReselectDraft>({
    conceptId: null,
    conceptPreviewId: null,
    externalNamingIds: [],
    internalNamingId: null,
  })

  /**
   * True while the Supervisor has made at least one un-saved change in the
   * current reselect session. Used by the `seed*` functions to AVOID
   * overwriting an in-progress draft when the Supervisor navigates back
   * and re-mounts a view. Cleared on save / reset / explicit clear.
   */
  const supervisorReselectDraftInProgress = ref(false)

  // ─── F5-safe localStorage persistence ─────────────────────────────────────

  const _writeDraftDebounced = debounce(
    (id: string, draft: SupervisorReselectDraft) => {
      writeSupervisorReselectDraft(id, draft)
    },
    400
  )

  watch(
    supervisorReselectDraft,
    draft => {
      const id = brandId.value
      if (!id || !supervisorReselectDraftInProgress.value) return
      _writeDraftDebounced(id, draft)
    },
    { deep: true }
  )

  /**
   * Called from the parent route guard after `store.loadBrand()` to overlay
   * any cached in-progress picks over the freshly loaded store state.
   */
  function restoreSupervisorReselectDraftFromStorage(briefId: string) {
    try {
      const envelope = readSupervisorReselectDraft(briefId)
      if (!envelope) return
      supervisorReselectDraft.value = { ...envelope.draft }
      supervisorReselectDraftInProgress.value = true
    } catch (err) {
      logSilent('useSupervisorReselectDraft/restore', err)
    }
  }

  function resetSupervisorReselectDraft() {
    const id = brandId.value
    if (id) clearSupervisorReselectDraft(id)
    supervisorReselectDraft.value = {
      conceptId: null,
      conceptPreviewId: null,
      externalNamingIds: [],
      internalNamingId: null,
    }
    supervisorReselectDraftInProgress.value = false
  }

  /** Confirmed Supervisor concept override. Pass `null` to clear (= keep Author concept). */
  function setSupervisorReselectConcept(id: string | null) {
    supervisorReselectDraft.value = { ...supervisorReselectDraft.value, conceptId: id }
    supervisorReselectDraftInProgress.value = true
  }

  /** Currently previewed concept in slider (independent of confirmation). */
  function setSupervisorReselectConceptPreview(id: string | null) {
    supervisorReselectDraft.value = { ...supervisorReselectDraft.value, conceptPreviewId: id }
  }

  /**
   * Atomic single-click selection: confirms a Supervisor override and syncs
   * the slider preview to it in one update. Pass `id = null` to clear the
   * override and revert the preview to `fallbackPreviewId` (usually the
   * Author concept id).
   *
   * If the Supervisor switches to a DIFFERENT concept than was previously
   * selected in the draft, the external naming picks are cleared — they
   * belonged to the old concept and are no longer valid.
   */
  function selectSupervisorReselectConcept(id: string | null, fallbackPreviewId: string | null) {
    const prevConceptId = supervisorReselectDraft.value.conceptId
    const conceptChanged = prevConceptId !== id
    supervisorReselectDraft.value = {
      ...supervisorReselectDraft.value,
      conceptId: id,
      conceptPreviewId: id ?? fallbackPreviewId,
      externalNamingIds: conceptChanged
        ? []
        : supervisorReselectDraft.value.externalNamingIds,
    }
    supervisorReselectDraftInProgress.value = true
  }

  /** Toggles an external naming id in/out of the staged set, with limit 3. */
  function toggleSupervisorReselectExternalNaming(id: string): boolean {
    const current = [...supervisorReselectDraft.value.externalNamingIds]
    const idx = current.indexOf(id)
    if (idx >= 0) {
      current.splice(idx, 1)
    } else {
      if (current.length >= SUPERVISOR_RESELECT_EXTERNAL_NAMING_LIMIT) return false
      current.push(id)
    }
    supervisorReselectDraft.value = {
      ...supervisorReselectDraft.value,
      externalNamingIds: current,
    }
    supervisorReselectDraftInProgress.value = true
    return true
  }

  function setSupervisorReselectExternalNamingIds(ids: string[]) {
    supervisorReselectDraft.value = {
      ...supervisorReselectDraft.value,
      externalNamingIds: ids.slice(0, SUPERVISOR_RESELECT_EXTERNAL_NAMING_LIMIT),
    }
  }

  function setSupervisorReselectInternalNaming(id: string | null) {
    supervisorReselectDraft.value = { ...supervisorReselectDraft.value, internalNamingId: id }
    supervisorReselectDraftInProgress.value = true
  }

  /**
   * Prefill draft from saved Supervisor picks, else Author `stepData`, for
   * the given re-select entry point.
   *
   * If the Supervisor already has in-progress (un-saved) changes in the
   * draft, the seed is skipped — otherwise navigating back to a previous
   * step would silently discard those changes (e.g. "Назад" from external
   * naming would reset the just-picked concept on the concept screen).
   */
  function seedSupervisorReselectFromBrand(section: SupervisorReselectSection) {
    if (supervisorReselectDraftInProgress.value) return
    const sel = brandCeoSelections.value
    const sd = stepData.value
    resetSupervisorReselectDraft()
    if (section === 'concept') {
      const supervisorConcept = readSelectionAsString(sel?.concept)
      supervisorReselectDraft.value.conceptId = supervisorConcept
      // Right-panel preview is shown only for a real Supervisor override:
      //  - saved Supervisor concept → restore it
      //  - no saved Supervisor concept yet → null (empty right panel until first click)
      // Do NOT fall back to the Author pick — that would mislabel Author's
      // concept as "Supervisor's choice".
      supervisorReselectDraft.value.conceptPreviewId = supervisorConcept
    } else if (section === 'externalNaming') {
      supervisorReselectDraft.value.conceptId =
        readSelectionAsString(sel?.concept) ?? sd.concept.selectedId
      const saved = readSelectionAsArray(sel?.externalNaming)
      supervisorReselectDraft.value.externalNamingIds =
        saved.length > 0
          ? saved
          : sd.externalNaming.selectedIds.slice(0, SUPERVISOR_RESELECT_EXTERNAL_NAMING_LIMIT)
    } else {
      supervisorReselectDraft.value.internalNamingId =
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
   * Otherwise: if the Supervisor chose the SAME concept as their last saved
   * pick, restore previously saved external naming IDs. If the concept
   * changed, start fresh — old picks belonged to the old concept.
   */
  function seedSupervisorReselectExternalNamingChained() {
    if (supervisorReselectDraft.value.externalNamingIds.length > 0) return

    const savedConceptId = readSelectionAsString(brandCeoSelections.value?.concept)
    const savedExternalIds = readSelectionAsArray(brandCeoSelections.value?.externalNaming)
    const currentConceptId = supervisorReselectDraft.value.conceptId

    const externalNamingIds =
      currentConceptId &&
      currentConceptId === savedConceptId &&
      savedExternalIds.length > 0
        ? savedExternalIds.slice(0, SUPERVISOR_RESELECT_EXTERNAL_NAMING_LIMIT)
        : []

    supervisorReselectDraft.value = {
      ...supervisorReselectDraft.value,
      externalNamingIds,
    }
  }

  function resetSlice() {
    resetSupervisorReselectDraft()
  }

  return {
    supervisorReselectDraft,
    resetSupervisorReselectDraft,
    setSupervisorReselectConcept,
    setSupervisorReselectConceptPreview,
    selectSupervisorReselectConcept,
    toggleSupervisorReselectExternalNaming,
    setSupervisorReselectExternalNamingIds,
    setSupervisorReselectInternalNaming,
    seedSupervisorReselectFromBrand,
    seedSupervisorReselectExternalNamingChained,
    restoreSupervisorReselectDraftFromStorage,
    // Facade-internal
    resetSlice,
  }
}

export type UseSupervisorReselectDraftReturn = ReturnType<typeof useSupervisorReselectDraft>
