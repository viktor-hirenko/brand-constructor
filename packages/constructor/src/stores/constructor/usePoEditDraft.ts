import { ref, watch, type Ref } from 'vue'
import type { BrandStepData } from '@brand-constructor/shared/types'
import { BRAND_BRIEF_STATUS } from '@brand-constructor/shared/constants'
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
  brandStatus: Ref<string>
  /** From `useBrandData` — replaced on restore by the cached overlay. */
  stepData: Ref<BrandStepData>
  /** From `useEditSection` — included in the overlay so «Скасувати» still works after F5. */
  editingSection: Ref<string | null>
  editingSectionSnapshot: Ref<unknown>
  /** From `useEditSection` — used during restore to re-apply key + snapshot. */
  restoreEditingSession: (key: string | null, snapshot: unknown) => void
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
 */
export interface PoEditDraft {
  baselineConceptId: string | null
  baselineExternalIds: string[]
  pendingConceptId: string | null
  /** `null` = nothing has been staged yet (distinct from an empty array). */
  pendingExternalIds: string[] | null
}

/**
 * Transient draft state for the PO (Author) inline-edit chained flow
 * (`/po-edit/concept` → `/po-edit/concept/external-naming`).
 *
 * The slice owns:
 *  - `poEditDraft` — see {@link PoEditDraft}
 *  - immutable-once-set baseline setters (no-op if a baseline is already
 *    captured), so re-mounting a view does not overwrite the original PO
 *    state with a mid-session value
 *  - pending setters used by «Назад / Далі» navigation inside the flow
 *
 * F5 persistence: while the brief is in `needs_revision`, the slice
 * autosaves a **full overlay** of the Author's in-progress revision state
 * (this draft + active edit section + full `stepData`) into localStorage so
 * any mutation — checkbox toggle, comment, marketing package switch —
 * survives a refresh. Restored from the parent route guard after
 * `loadBrand()`.
 *
 * Sister slice to `useCeoReselectDraft` — same lifecycle shape (transient,
 * reset on save / cancel / brand load).
 */
export function usePoEditDraft(opts: UsePoEditDraftOptions) {
  const {
    brandId,
    brandStatus,
    stepData,
    editingSection,
    editingSectionSnapshot,
    restoreEditingSession,
  } = opts

  const poEditDraft = ref<PoEditDraft>({
    baselineConceptId: null,
    baselineExternalIds: [],
    pendingConceptId: null,
    pendingExternalIds: null,
  })

  /** Guards restore from re-triggering the autosave watcher. */
  const isRestoring = ref(false)

  function capturePoEditBaselineConcept(id: string | null) {
    if (!id) return
    if (poEditDraft.value.baselineConceptId) return
    poEditDraft.value.baselineConceptId = id
  }

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

  /**
   * Persistence guard. We only write to author-revision storage while the
   * brief is in `needs_revision` (the Author returns to fix Supervisor
   * comments). Draft / approved / submitted lifecycles are handled by their
   * own storage layers and must not pollute this scope.
   */
  function shouldPersistAuthorRevision(): boolean {
    return brandStatus.value === BRAND_BRIEF_STATUS.NEEDS_REVISION
  }

  function snapshotEnvelopeDraft() {
    return {
      poEditDraft: { ...poEditDraft.value },
      editingSection: editingSection.value,
      editingSectionSnapshot: editingSectionSnapshot.value,
      stepDataOverlay: JSON.parse(JSON.stringify(stepData.value)) as BrandStepData,
    }
  }

  const _persistEnvelopeDebounced = debounce(() => {
    const id = brandId.value
    if (!id) return
    if (!shouldPersistAuthorRevision()) return
    writeAuthorRevisionDraft(id, snapshotEnvelopeDraft(), brandStatus.value)
  }, 400)

  // One unified watcher — every Author-side mutation (chained picks, active
  // inline-edit, or any field in `stepData`) triggers a single debounced
  // write of the full overlay envelope.
  watch(
    [poEditDraft, editingSection, editingSectionSnapshot, stepData],
    () => {
      if (isRestoring.value) return
      _persistEnvelopeDebounced()
    },
    { deep: true }
  )

  /**
   * Called from the parent route guard after `store.loadBrand()` to overlay
   * any cached in-progress revision state over the freshly loaded server
   * snapshot.
   *
   * Order of operations is critical:
   *  1. Replace `stepData` with the cached overlay (so the UI re-renders
   *     with the Author's uncommitted mutations on top).
   *  2. Restore `editingSection` + its snapshot via the dedicated method so
   *     «Скасувати» still has the pre-edit baseline.
   *  3. Re-apply the `poEditDraft` (chained-flow baseline + pending).
   *
   * Stale-protection: envelope is dropped when `briefStatus` no longer
   * matches the current status (e.g. Supervisor approved while Author was
   * away).
   */
  function restoreAuthorRevisionDraftFromStorage(briefId: string) {
    try {
      const envelope = readAuthorRevisionDraft(briefId)
      if (!envelope) return
      if (envelope.briefStatus && envelope.briefStatus !== brandStatus.value) {
        clearAuthorRevisionDraft(briefId)
        return
      }

      isRestoring.value = true
      try {
        if (envelope.draft.stepDataOverlay) {
          stepData.value = {
            ...envelope.draft.stepDataOverlay,
            stepLayoutVersion: 2,
          }
        }

        restoreEditingSession(envelope.draft.editingSection, envelope.draft.editingSectionSnapshot)

        poEditDraft.value = { ...envelope.draft.poEditDraft }
      } finally {
        // Defer re-arming the watcher to the next microtask so all reactive
        // updates triggered above settle without producing a redundant write.
        queueMicrotask(() => {
          isRestoring.value = false
        })
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
