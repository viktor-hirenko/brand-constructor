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

interface UseAuthorRevisionDraftOptions {
  brandId: Ref<string | null>
  brandStatus: Ref<string>
  /** From `useBrandData` — replaced on restore by the cached overlay. */
  stepData: Ref<BrandStepData>
  /** From `useInlineSectionEdit` — included in the overlay so «Скасувати» still works after F5. */
  editingSection: Ref<string | null>
  editingSectionSnapshot: Ref<unknown>
  /** From `useInlineSectionEdit` — used during restore to re-apply key + snapshot. */
  restoreEditingSession: (key: string | null, snapshot: unknown) => void
}

/**
 * `baseline*` — snapshot of stepData taken when the Author opens an
 *   inline-edit session. Used by «Скасувати» to revert any mutations the
 *   Author made to stepData during the session.
 *
 * `pending*` — what the user has selected but not yet saved. Survives the
 *   chained `concept → external-naming → concept` navigation so the user
 *   sees their picks intact after going back and forward inside the same
 *   SPA session. Cleared when the corresponding flow commits or is reset.
 */
export interface AuthorRevisionDraft {
  baselineConceptId: string | null
  baselineExternalIds: string[]
  pendingConceptId: string | null
  /** `null` = nothing has been staged yet (distinct from an empty array). */
  pendingExternalIds: string[] | null
}

/**
 * Transient draft state for the Author (Product Owner) inline-edit chained
 * flow (`/po-edit/concept` → `/po-edit/concept/external-naming`).
 *
 * The slice owns:
 *  - `authorRevisionDraft` — see {@link AuthorRevisionDraft}
 *  - immutable-once-set baseline setters (no-op if a baseline is already
 *    captured), so re-mounting a view does not overwrite the original
 *    Author state with a mid-session value
 *  - pending setters used by «Назад / Далі» navigation inside the flow
 *
 * F5 persistence: while the brief is in `needs_revision`, the slice
 * autosaves a **full overlay** of the Author's in-progress revision state
 * (this draft + active edit section + full `stepData`) into localStorage so
 * any mutation — checkbox toggle, comment, marketing package switch —
 * survives a refresh. Restored from the parent route guard after
 * `loadBrand()`.
 *
 * Sister slice to `useSupervisorReselectDraft` — same lifecycle shape
 * (transient, reset on save / cancel / brand load).
 */
export function useAuthorRevisionDraft(opts: UseAuthorRevisionDraftOptions) {
  const {
    brandId,
    brandStatus,
    stepData,
    editingSection,
    editingSectionSnapshot,
    restoreEditingSession,
  } = opts

  const authorRevisionDraft = ref<AuthorRevisionDraft>({
    baselineConceptId: null,
    baselineExternalIds: [],
    pendingConceptId: null,
    pendingExternalIds: null,
  })

  /** Guards restore from re-triggering the autosave watcher. */
  const isRestoring = ref(false)

  function captureAuthorRevisionBaselineConcept(id: string | null) {
    if (!id) return
    if (authorRevisionDraft.value.baselineConceptId) return
    authorRevisionDraft.value.baselineConceptId = id
  }

  function captureAuthorRevisionBaselineExternal(ids: string[]) {
    authorRevisionDraft.value.baselineExternalIds = [...ids]
  }

  function setAuthorRevisionPendingConcept(id: string) {
    if (!id) return
    authorRevisionDraft.value.pendingConceptId = id
  }

  function setAuthorRevisionPendingExternal(ids: string[]) {
    authorRevisionDraft.value.pendingExternalIds = [...ids]
  }

  function clearAuthorRevisionPendingExternal() {
    authorRevisionDraft.value.pendingExternalIds = null
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
      chainedDraft: { ...authorRevisionDraft.value },
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

  watch(
    [authorRevisionDraft, editingSection, editingSectionSnapshot, stepData],
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
   *  3. Re-apply the `authorRevisionDraft` (chained-flow baseline + pending).
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
      // Envelope-shape guard: silently discard legacy envelopes that pre-date
      // the `chainedDraft` rename. (`poEditDraft` was the previous key.)
      if (!envelope.draft || !envelope.draft.chainedDraft) {
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

        authorRevisionDraft.value = { ...envelope.draft.chainedDraft }
      } finally {
        queueMicrotask(() => {
          isRestoring.value = false
        })
      }
    } catch (err) {
      logSilent('useAuthorRevisionDraft/restore', err)
    }
  }

  /** Drop every key in the draft — call on save / cancel / commit. */
  function resetAuthorRevisionDraft() {
    const id = brandId.value
    if (id) clearAuthorRevisionDraft(id)
    authorRevisionDraft.value = {
      baselineConceptId: null,
      baselineExternalIds: [],
      pendingConceptId: null,
      pendingExternalIds: null,
    }
  }

  function resetSlice() {
    resetAuthorRevisionDraft()
  }

  return {
    authorRevisionDraft,
    captureAuthorRevisionBaselineConcept,
    captureAuthorRevisionBaselineExternal,
    setAuthorRevisionPendingConcept,
    setAuthorRevisionPendingExternal,
    clearAuthorRevisionPendingExternal,
    resetAuthorRevisionDraft,
    restoreAuthorRevisionDraftFromStorage,
    // Facade-internal
    resetSlice,
  }
}

export type UseAuthorRevisionDraftReturn = ReturnType<typeof useAuthorRevisionDraft>
