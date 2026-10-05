import { ref, watch, type Ref } from 'vue'
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
  /**
   * True once `baselineExternalIds` was really captured — i.e. «Далі» with a
   * different concept was pressed and the external picks may be cleared from
   * here on. Without it an empty `baselineExternalIds` could not be told apart
   * from «never captured», and «Скасувати» straight from the concept screen
   * wrote that empty list over the Author's names (owner 30.09).
   */
  baselineExternalCaptured: boolean
  pendingConceptId: string | null
  /** `null` = nothing has been staged yet (distinct from an empty array). */
  pendingExternalIds: string[] | null
  /**
   * Sections the Author explicitly resolved by going through the edit-flow
   * and pressing Save — even if they chose neither their original nor the
   * Supervisor's suggestion (the «third-option» case).
   * Cleared only on `resetSlice()` (full brand load / submit), NOT on
   * `resetAuthorRevisionDraft()` (chained-flow reset) so the markers
   * survive the navigation back to the final review screen.
   */
  resolvedConflictSections: string[]
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
 * F5 persistence: while the brief is in `needs_revision`, only
 * `resolvedConflictSections` goes to localStorage — the server does not know
 * about them. The chained picks stay in memory: an edit the Author did not
 * save is dropped on F5, as in a draft (H-03, run 02.10: D-07, D-13). Until
 * 05.10 the whole `stepData` and the open edit were stored and put back, and
 * the review then showed a half-done edit as saved.
 *
 * Sister slice to `useSupervisorAlternativeDraft` — same lifecycle shape
 * (transient, reset on save / cancel / brand load).
 */
export function useAuthorRevisionDraft(opts: UseAuthorRevisionDraftOptions) {
  const { brandId, brandStatus } = opts

  const authorRevisionDraft = ref<AuthorRevisionDraft>({
    baselineConceptId: null,
    baselineExternalIds: [],
    baselineExternalCaptured: false,
    pendingConceptId: null,
    pendingExternalIds: null,
    resolvedConflictSections: [],
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
    authorRevisionDraft.value.baselineExternalCaptured = true
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

  /**
   * Mark `section` as explicitly resolved by the Author.
   * Called from revision-response views after a successful `goSave()` / `goDali()`.
   * Idempotent — calling it multiple times for the same section is safe.
   */
  function markConflictSectionResolved(section: string) {
    if (authorRevisionDraft.value.resolvedConflictSections.includes(section)) return
    authorRevisionDraft.value.resolvedConflictSections = [
      ...authorRevisionDraft.value.resolvedConflictSections,
      section,
    ]
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

  const _persistEnvelopeDebounced = debounce(() => {
    const id = brandId.value
    if (!id) return
    if (!shouldPersistAuthorRevision()) return
    const resolvedConflictSections = [...authorRevisionDraft.value.resolvedConflictSections]
    if (resolvedConflictSections.length === 0) {
      clearAuthorRevisionDraft(id)
      return
    }
    writeAuthorRevisionDraft(id, { resolvedConflictSections }, brandStatus.value)
  }, 400)

  watch(
    () => authorRevisionDraft.value.resolvedConflictSections,
    () => {
      if (isRestoring.value) return
      _persistEnvelopeDebounced()
    },
    { deep: true }
  )

  /**
   * Called from the parent route guard after `store.loadBrand()`: puts back
   * the Author's «resolved» markers. Envelopes from before 05.10 also carry a
   * `stepData` overlay and an open edit — they are ignored, so the review shows
   * what the server has.
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
      const markers = envelope.draft?.resolvedConflictSections
      if (!Array.isArray(markers) || markers.length === 0) {
        clearAuthorRevisionDraft(briefId)
        return
      }
      isRestoring.value = true
      try {
        authorRevisionDraft.value = {
          ...authorRevisionDraft.value,
          resolvedConflictSections: markers.filter((m): m is string => typeof m === 'string'),
        }
      } finally {
        queueMicrotask(() => {
          isRestoring.value = false
        })
      }
    } catch (err) {
      logSilent('useAuthorRevisionDraft/restore', err)
    }
  }

  /**
   * Reset the chained-flow portion of the draft (concept + external picks).
   * Called after the chained flow saves — intentionally does NOT clear
   * `resolvedConflictSections` so those markers survive the navigation back
   * to the final review screen (they're cleared by `resetSlice` instead).
   * The stored envelope holds only those markers, so it stays as it is.
   */
  function resetAuthorRevisionDraft() {
    authorRevisionDraft.value = {
      baselineConceptId: null,
      baselineExternalIds: [],
      baselineExternalCaptured: false,
      pendingConceptId: null,
      pendingExternalIds: null,
      // Preserve resolved markers — cleared only on full reset (resetSlice).
      resolvedConflictSections: authorRevisionDraft.value.resolvedConflictSections,
    }
  }

  /** Full reset — called by the store facade on `loadBrand` / brand switch. */
  function resetSlice() {
    const id = brandId.value
    if (id) clearAuthorRevisionDraft(id)
    authorRevisionDraft.value = {
      baselineConceptId: null,
      baselineExternalIds: [],
      baselineExternalCaptured: false,
      pendingConceptId: null,
      pendingExternalIds: null,
      resolvedConflictSections: [],
    }
  }

  return {
    authorRevisionDraft,
    captureAuthorRevisionBaselineConcept,
    captureAuthorRevisionBaselineExternal,
    setAuthorRevisionPendingConcept,
    setAuthorRevisionPendingExternal,
    clearAuthorRevisionPendingExternal,
    markConflictSectionResolved,
    resetAuthorRevisionDraft,
    restoreAuthorRevisionDraftFromStorage,
    // Facade-internal
    resetSlice,
  }
}

export type UseAuthorRevisionDraftReturn = ReturnType<typeof useAuthorRevisionDraft>
