import { ref, watch, type Ref } from 'vue'
import {
  writeAuthorRevisionDraft,
  readAuthorRevisionDraft,
  clearAuthorRevisionDraft,
} from '@/domain/persistence/briefDraftStorage'
import { logSilent } from '@/utils/log'

function debounce<T extends (...args: Parameters<T>) => void>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout> | undefined
  return ((...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }) as T
}

interface UsePoEditDraftOptions {
  brandId: Ref<string | null>
}

/**
 * `baseline*` — snapshot of stepData taken when the PO opens an inline-edit
 *   session. Used by «Скасувати» to revert any mutations the PO made to
 *   stepData during the session.
 *
 * `pending*` — what the user has selected but not yet saved. Survives the
 *   chained `concept → external-naming → concept` navigation so the user
 *   sees their picks intact after going back and forward inside the same
 *   SPA session. Cleared when the corresponding flow commits or is reset.
 *
 * State lives in Pinia (not sessionStorage) — F5 redirects to the brand
 * review page via the router guard, so cross-reload survival is no longer
 * a concern for this slice.
 */
export interface PoEditDraft {
  baselineConceptId: string | null
  baselineExternalIds: string[]
  pendingConceptId: string | null
  /** `null` = nothing has been staged yet (distinct from an empty array). */
  pendingExternalIds: string[] | null
}

/**
 * Transient draft state for the PO inline-edit chained flow
 * (`/po-edit/concept` → `/po-edit/concept/external-naming`).
 *
 * The slice owns:
 *  - `poEditDraft` — see {@link PoEditDraft}
 *  - immutable-once-set baseline setters (no-op if a baseline is already
 *    captured), so re-mounting a view does not overwrite the original PO
 *    state with a mid-session value
 *  - pending setters used by «Назад / Далі» navigation inside the flow
 *
 * Sister slice to `useCeoReselectDraft` — same lifecycle shape (transient,
 * reset on save / cancel / brand load).
 */
export function usePoEditDraft(opts: UsePoEditDraftOptions) {
  const { brandId } = opts

  const poEditDraft = ref<PoEditDraft>({
    baselineConceptId: null,
    baselineExternalIds: [],
    pendingConceptId: null,
    pendingExternalIds: null,
  })

  /**
   * Capture the PO concept id that was selected BEFORE the edit session
   * started. No-op if a baseline is already set or if `id` is falsy —
   * either of those would silently overwrite a legitimate baseline with a
   * mid-session value.
   */
  function capturePoEditBaselineConcept(id: string | null) {
    if (!id) return
    if (poEditDraft.value.baselineConceptId) return
    poEditDraft.value.baselineConceptId = id
  }

  /**
   * Capture the PO external-naming ids selected BEFORE the edit session
   * started. Called from the concept screen on «Далі» (which is about to
   * mutate `stepData.externalNaming.selectedIds`).
   */
  function capturePoEditBaselineExternal(ids: string[]) {
    poEditDraft.value.baselineExternalIds = [...ids]
  }

  function setPoEditPendingConcept(id: string) {
    if (!id) return
    poEditDraft.value.pendingConceptId = id
  }

  function setPoEditPendingExternal(ids: string[]) {
    poEditDraft.value.pendingExternalIds = [...ids]
  }

  function clearPoEditPendingExternal() {
    poEditDraft.value.pendingExternalIds = null
  }

  // ─── F5-safe localStorage persistence ─────────────────────────────────────

  const _writeDraftDebounced = debounce((id: string, draft: PoEditDraft) => {
    writeAuthorRevisionDraft(id, {
      pendingConceptId: draft.pendingConceptId,
      pendingExternalIds: draft.pendingExternalIds,
    })
  }, 400)

  watch(
    poEditDraft,
    draft => {
      const id = brandId.value
      if (!id || draft.pendingConceptId === null) return
      _writeDraftDebounced(id, draft)
    },
    { deep: true }
  )

  /**
   * Called from the parent route guard after `store.loadBrand()` to overlay
   * any cached in-progress picks over the freshly loaded store state.
   */
  function restoreAuthorRevisionDraftFromStorage(briefId: string) {
    try {
      const envelope = readAuthorRevisionDraft(briefId)
      if (!envelope) return
      poEditDraft.value = {
        ...poEditDraft.value,
        pendingConceptId: envelope.draft.pendingConceptId,
        pendingExternalIds: envelope.draft.pendingExternalIds,
      }
    } catch (err) {
      logSilent('usePoEditDraft/restore', err)
    }
  }

  /** Drop every key in the draft — call on save / cancel / commit. */
  function resetPoEditDraft() {
    const id = brandId.value
    if (id) clearAuthorRevisionDraft(id)
    poEditDraft.value = {
      baselineConceptId: null,
      baselineExternalIds: [],
      pendingConceptId: null,
      pendingExternalIds: null,
    }
  }

  function resetSlice() {
    resetPoEditDraft()
  }

  return {
    poEditDraft,
    capturePoEditBaselineConcept,
    capturePoEditBaselineExternal,
    setPoEditPendingConcept,
    setPoEditPendingExternal,
    clearPoEditPendingExternal,
    resetPoEditDraft,
    restoreAuthorRevisionDraftFromStorage,
    // Facade-internal
    resetSlice,
  }
}

export type UsePoEditDraftReturn = ReturnType<typeof usePoEditDraft>
