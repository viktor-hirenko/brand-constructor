import { ref } from 'vue'

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
export function usePoEditDraft() {
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

  /** Drop every key in the draft — call on save / cancel / commit. */
  function resetPoEditDraft() {
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
    // Facade-internal
    resetSlice,
  }
}

export type UsePoEditDraftReturn = ReturnType<typeof usePoEditDraft>
