/**
 * Typed envelopes stored in localStorage for each draft scope.
 *
 * Every envelope includes:
 *  - `briefId`  — for stale-protection: discarded if it doesn't match the
 *    currently-loaded brief (e.g. user navigates to a different brand).
 *  - `savedAt`  — unix ms timestamp; envelopes older than MAX_AGE_MS are
 *    treated as stale and automatically discarded.
 *
 * Shapes mirror the underlying Pinia slice interfaces so the merger can do a
 * direct object spread without any transformation.
 */

/** Maximum age of a cached envelope. Stale entries are silently dropped. */
export const BRIEF_DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000

/** Cached state for the Supervisor's in-progress alternative selections. */
export interface BriefSupervisorReselectEnvelope {
  briefId: string
  savedAt: number
  draft: {
    conceptId: string | null
    conceptPreviewId: string | null
    externalNamingIds: string[]
    internalNamingId: string | null
  }
}

/** Cached state for the Author's in-progress revision picks. */
export interface BriefAuthorRevisionEnvelope {
  briefId: string
  savedAt: number
  draft: {
    pendingConceptId: string | null
    pendingExternalIds: string[] | null
  }
}
