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

import type { BrandStepData } from '@brand-constructor/shared/types'

/** Maximum age of a cached envelope. Stale entries are silently dropped. */
export const BRIEF_DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000

/** Cached state for the Supervisor's in-progress alternative selections. */
export interface BriefSupervisorReselectEnvelope {
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
 * Cached state for the Author's in-progress revision picks.
 *
 * Covers the full surface area the Author can mutate while the brief is in
 * `needs_revision` state:
 *  - `poEditDraft`              — chained `concept → external-naming` picks
 *    (baseline + pending), see {@link PoEditDraft}.
 *  - `editingSection` / `editingSectionSnapshot` — inline section-edit state
 *    (basics, marketing, deliverables, visualComponents, …). Required so
 *    «Скасувати» can still revert untouched state after a refresh.
 *  - `stepDataOverlay`          — full `stepData` snapshot. Replaces the
 *    server-loaded `stepData` on restore so every uncommitted mutation
 *    (toggling a checkbox, typing a comment, switching a marketing package)
 *    survives F5.
 */
export interface BriefAuthorRevisionEnvelope {
  briefId: string
  savedAt: number
  briefStatus?: string
  draft: {
    poEditDraft: {
      baselineConceptId: string | null
      baselineExternalIds: string[]
      pendingConceptId: string | null
      pendingExternalIds: string[] | null
    }
    editingSection: string | null
    editingSectionSnapshot: unknown
    stepDataOverlay: BrandStepData | null
  }
}
