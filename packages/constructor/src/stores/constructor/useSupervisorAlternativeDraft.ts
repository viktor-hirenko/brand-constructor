import { ref, watch, type Ref } from 'vue'
import { readSelectionAsString, readSelectionAsArray } from './selectionHelpers'
import type { BrandStepData } from '@brand-constructor/shared/types'
import {
  writeSupervisorAlternativeDraft,
  readSupervisorAlternativeDraft,
  clearSupervisorAlternativeDraft,
} from '@/domain/persistence/briefDraftStorage'
import { logSilent } from '@/utils/log'

function debounce<T extends (...args: Parameters<T>) => void>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout> | undefined
  return ((...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }) as T
}

export type SupervisorAlternativeSection = 'concept' | 'externalNaming' | 'internalNaming'

export interface SupervisorAlternativeDraft {
  /** Confirmed Supervisor concept override (null = no override, slider stays on Author concept). */
  conceptId: string | null
  /** What the slider currently shows (independent of confirmation). */
  conceptPreviewId: string | null
  externalNamingIds: string[]
  internalNamingId: string | null
}

export const SUPERVISOR_ALTERNATIVE_EXTERNAL_NAMING_LIMIT = 3

interface UseSupervisorAlternativeDraftOptions {
  /** Wizard step-data from `useBrandData` — `seedFromBrand` falls back to Author picks. */
  stepData: Ref<BrandStepData>
  /** Saved Supervisor picks from `useCeoReview` — preferred source for seeding the draft. */
  brandSupervisorSelections: Ref<Record<string, string | string[]> | null>
  /** Brand id from `useBrandData` — used to scope the localStorage cache key. */
  brandId: Ref<string | null>
}

/**
 * Transient state for the dedicated Supervisor re-select routes
 * (`/alternative-selection/*` — the URL fragment is kept for backward-compat; the
 * domain meaning is "Supervisor proposes an alternative for the Author").
 *
 * Owns:
 *  - `supervisorAlternativeDraft` — staged Supervisor picks before "Зберегти"
 *    persists them via `useCeoReview.saveSupervisorSelections`
 *  - per-field setters used by the three Supervisor re-select step views
 *  - `seedSupervisorAlternativeFromBrand` — prefill draft from saved Supervisor
 *    picks, falling back to Author `stepData` for the matching section
 *  - `seedSupervisorAlternativeExternalNamingChained` — chained-mode helper
 *    that clears external naming picks after a concept change (the old
 *    external set belonged to the previous concept and is no longer valid)
 *
 * Stays transient — nothing here is persisted to the server until the
 * Supervisor confirms via `saveSupervisorSelections` in the parent view.
 */
export function useSupervisorAlternativeDraft(opts: UseSupervisorAlternativeDraftOptions) {
  const { stepData, brandSupervisorSelections, brandId } = opts

  const supervisorAlternativeDraft = ref<SupervisorAlternativeDraft>({
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
  const supervisorAlternativeDraftInProgress = ref(false)

  // ─── F5-safe localStorage persistence ─────────────────────────────────────

  const _writeDraftDebounced = debounce(
    (id: string, draft: SupervisorAlternativeDraft) => {
      writeSupervisorAlternativeDraft(id, draft)
    },
    400
  )

  watch(
    supervisorAlternativeDraft,
    draft => {
      const id = brandId.value
      if (!id || !supervisorAlternativeDraftInProgress.value) return
      _writeDraftDebounced(id, draft)
    },
    { deep: true }
  )

  /**
   * Called from the parent route guard after `store.loadBrand()` to overlay
   * any cached in-progress picks over the freshly loaded store state.
   */
  function restoreSupervisorAlternativeDraftFromStorage(briefId: string) {
    try {
      const envelope = readSupervisorAlternativeDraft(briefId)
      if (!envelope) return
      supervisorAlternativeDraft.value = { ...envelope.draft }
      supervisorAlternativeDraftInProgress.value = true
    } catch (err) {
      logSilent('useSupervisorAlternativeDraft/restore', err)
    }
  }

  function resetSupervisorAlternativeDraft() {
    const id = brandId.value
    if (id) clearSupervisorAlternativeDraft(id)
    supervisorAlternativeDraft.value = {
      conceptId: null,
      conceptPreviewId: null,
      externalNamingIds: [],
      internalNamingId: null,
    }
    supervisorAlternativeDraftInProgress.value = false
  }

  /** Confirmed Supervisor concept override. Pass `null` to clear (= keep Author concept). */
  function setSupervisorAlternativeConcept(id: string | null) {
    supervisorAlternativeDraft.value = { ...supervisorAlternativeDraft.value, conceptId: id }
    supervisorAlternativeDraftInProgress.value = true
  }

  /** Currently previewed concept in slider (independent of confirmation). */
  function setSupervisorAlternativeConceptPreview(id: string | null) {
    supervisorAlternativeDraft.value = { ...supervisorAlternativeDraft.value, conceptPreviewId: id }
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
  function selectSupervisorAlternativeConcept(id: string | null, fallbackPreviewId: string | null) {
    const prevConceptId = supervisorAlternativeDraft.value.conceptId
    const conceptChanged = prevConceptId !== id
    supervisorAlternativeDraft.value = {
      ...supervisorAlternativeDraft.value,
      conceptId: id,
      conceptPreviewId: id ?? fallbackPreviewId,
      externalNamingIds: conceptChanged
        ? []
        : supervisorAlternativeDraft.value.externalNamingIds,
    }
    supervisorAlternativeDraftInProgress.value = true
  }

  /** Toggles an external naming id in/out of the staged set, with limit 3. */
  function toggleSupervisorAlternativeExternalNaming(id: string): boolean {
    const current = [...supervisorAlternativeDraft.value.externalNamingIds]
    const idx = current.indexOf(id)
    if (idx >= 0) {
      current.splice(idx, 1)
    } else {
      if (current.length >= SUPERVISOR_ALTERNATIVE_EXTERNAL_NAMING_LIMIT) return false
      current.push(id)
    }
    supervisorAlternativeDraft.value = {
      ...supervisorAlternativeDraft.value,
      externalNamingIds: current,
    }
    supervisorAlternativeDraftInProgress.value = true
    return true
  }

  function setSupervisorAlternativeExternalNamingIds(ids: string[]) {
    supervisorAlternativeDraft.value = {
      ...supervisorAlternativeDraft.value,
      externalNamingIds: ids.slice(0, SUPERVISOR_ALTERNATIVE_EXTERNAL_NAMING_LIMIT),
    }
  }

  function setSupervisorAlternativeInternalNaming(id: string | null) {
    supervisorAlternativeDraft.value = { ...supervisorAlternativeDraft.value, internalNamingId: id }
    supervisorAlternativeDraftInProgress.value = true
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
  function seedSupervisorAlternativeFromBrand(section: SupervisorAlternativeSection) {
    if (supervisorAlternativeDraftInProgress.value) return
    const sel = brandSupervisorSelections.value
    const sd = stepData.value
    resetSupervisorAlternativeDraft()
    if (section === 'concept') {
      const supervisorConcept = readSelectionAsString(sel?.concept)
      supervisorAlternativeDraft.value.conceptId = supervisorConcept
      // Right-panel preview is shown only for a real Supervisor override:
      //  - saved Supervisor concept → restore it
      //  - no saved Supervisor concept yet → null (empty right panel until first click)
      // Do NOT fall back to the Author pick — that would mislabel Author's
      // concept as "Supervisor's choice".
      supervisorAlternativeDraft.value.conceptPreviewId = supervisorConcept
    } else if (section === 'externalNaming') {
      supervisorAlternativeDraft.value.conceptId =
        readSelectionAsString(sel?.concept) ?? sd.concept.selectedId
      const saved = readSelectionAsArray(sel?.externalNaming)
      supervisorAlternativeDraft.value.externalNamingIds =
        saved.length > 0
          ? saved
          : sd.externalNaming.selectedIds.slice(0, SUPERVISOR_ALTERNATIVE_EXTERNAL_NAMING_LIMIT)
    } else {
      supervisorAlternativeDraft.value.internalNamingId =
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
  function seedSupervisorAlternativeExternalNamingChained() {
    if (supervisorAlternativeDraft.value.externalNamingIds.length > 0) return

    const savedConceptId = readSelectionAsString(brandSupervisorSelections.value?.concept)
    const savedExternalIds = readSelectionAsArray(brandSupervisorSelections.value?.externalNaming)
    const currentConceptId = supervisorAlternativeDraft.value.conceptId

    const externalNamingIds =
      currentConceptId &&
      currentConceptId === savedConceptId &&
      savedExternalIds.length > 0
        ? savedExternalIds.slice(0, SUPERVISOR_ALTERNATIVE_EXTERNAL_NAMING_LIMIT)
        : []

    supervisorAlternativeDraft.value = {
      ...supervisorAlternativeDraft.value,
      externalNamingIds,
    }
  }

  function resetSlice() {
    resetSupervisorAlternativeDraft()
  }

  return {
    supervisorAlternativeDraft,
    resetSupervisorAlternativeDraft,
    setSupervisorAlternativeConcept,
    setSupervisorAlternativeConceptPreview,
    selectSupervisorAlternativeConcept,
    toggleSupervisorAlternativeExternalNaming,
    setSupervisorAlternativeExternalNamingIds,
    setSupervisorAlternativeInternalNaming,
    seedSupervisorAlternativeFromBrand,
    seedSupervisorAlternativeExternalNamingChained,
    restoreSupervisorAlternativeDraftFromStorage,
    // Facade-internal
    resetSlice,
  }
}

export type UseSupervisorAlternativeDraftReturn = ReturnType<typeof useSupervisorAlternativeDraft>
