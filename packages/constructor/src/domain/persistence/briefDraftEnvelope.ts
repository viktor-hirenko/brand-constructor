/**
 * Typed envelopes stored in localStorage for each draft scope.
 *
 * Every envelope includes:
 *  - `briefId`     — for stale-protection: discarded if it doesn't match the
 *    currently-loaded brief (e.g. user navigates to a different brand).
 *  - `savedAt`     — unix ms timestamp; envelopes older than MAX_AGE_MS are
 *    treated as stale and automatically discarded.
 *  - `briefStatus` — server status at write time; on restore we discard the
 *    envelope if the brief's current status no longer matches (e.g. the
 *    Supervisor has already approved while the Author was editing).
 *
 * Shapes mirror the underlying Pinia slice interfaces so the merger can do a
 * direct object spread without any transformation.
 */

import type { BrandCeoComments, BrandStepData } from '@brand-constructor/shared/types'

/** Maximum age of a cached envelope. Stale entries are silently dropped. */
export const BRIEF_DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000

/** Cached state for the Supervisor's in-progress alternative selections. */
export interface BriefSupervisorAlternativeEnvelope {
  briefId: string
  savedAt: number
  briefStatus?: string
  draft: {
    conceptId: string | null
    conceptPreviewId: string | null
    externalNamingIds: string[]
    internalNamingId: string | null
  }
}

/**
 * What the browser keeps for a brief in `needs_revision`: the sections the
 * Author resolved with a choice of their own (see `resolvedConflictSections`
 * below). Nothing else — an edit the Author did not save is dropped, as in a
 * draft (H-03, run 02.10: D-07, D-13).
 *
 * Until 05.10 the envelope also carried the whole `stepData`, the open edit
 * section and the chained concept → external picks, and put them back after
 * F5: a half-done edit then looked saved while the server had the old one.
 * Envelopes of that shape are still read — only their markers are used.
 */
export interface BriefAuthorRevisionEnvelope {
  briefId: string
  savedAt: number
  briefStatus?: string
  draft: {
    /**
     * Sections where the Author went through the edit-flow and pressed Save,
     * resolving any Supervisor alternative conflict — regardless of whether
     * they picked the Supervisor's suggestion or a third option. The server
     * does not know about them, so this is their only home across F5.
     * Cleared only by `resetSlice()` (= loadBrand / full submit).
     */
    resolvedConflictSections?: string[]
  }
}

/**
 * Cached state for the Supervisor's in-progress comment edits.
 *
 * Supervisor comments live in `brandCeoComments` (a Pinia ref in
 * `useSupervisorReview`) but are NOT pushed to the server until the
 * Supervisor presses Approve / Needs Revision (the status-change handler in
 * `BriefReviewView` sends the full `ceoComments` payload alongside the new
 * status). Without F5 persistence, every comment typed in
 * `/ceo-reselect/*` views or on the final review screen would be lost on
 * refresh because `loadBrand` re-hydrates from the stale server snapshot.
 *
 * The envelope stores the entire `BrandCeoComments` map (including the
 * `resolved` flags) so the overlay can replace the loaded state verbatim.
 * Cleared by `purgeSupervisorCommentsCache` after a successful PATCH /status.
 */
export interface BriefSupervisorCommentsEnvelope {
  briefId: string
  savedAt: number
  briefStatus?: string
  draft: {
    commentsOverlay: BrandCeoComments
  }
}

/** Per-concept gallery slide indices for the right-column ConceptPreviewSlider. */
export interface BriefPreviewSlidesEnvelope {
  briefId: string
  savedAt: number
  draft: {
    slideIndicesByConceptId: Record<string, number>
  }
}

/**
 * A draft is something the Author comes back to days later, so its copy
 * outlives the 24h of the review-flow envelopes.
 */
export const BRIEF_WIZARD_DRAFT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

/**
 * The Author's unsaved wizard answers on a `draft` brief.
 *
 * `baseUpdatedAt` is the server `updatedAt` the copy was made on top of. On
 * restore the copy is applied only while the server still reports that same
 * value — if the brief was saved anywhere else in the meantime, the server
 * wins and the copy is dropped. Comparing the two server stamps avoids
 * comparing a browser clock with the server's.
 */
export interface BriefWizardDraftEnvelope {
  briefId: string
  savedAt: number
  baseUpdatedAt: string
  draft: {
    stepData: BrandStepData
  }
}
