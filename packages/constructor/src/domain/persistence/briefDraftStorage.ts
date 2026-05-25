import type { BrandCeoComments } from '@brand-constructor/shared/types'
import { logSilent } from '@/utils/log'
import { briefDraftStorageKey, type BriefDraftScope } from './briefDraftStorageKey'
import {
  BRIEF_DRAFT_MAX_AGE_MS,
  type BriefSupervisorAlternativeEnvelope,
  type BriefSupervisorCommentsEnvelope,
  type BriefAuthorRevisionEnvelope,
  type BriefPreviewSlidesEnvelope,
} from './briefDraftEnvelope'

type Envelope =
  | BriefSupervisorAlternativeEnvelope
  | BriefSupervisorCommentsEnvelope
  | BriefAuthorRevisionEnvelope
  | BriefPreviewSlidesEnvelope

// ─── Write ────────────────────────────────────────────────────────────────────

export function writeBriefDraft<T extends Envelope>(
  briefId: string,
  scope: BriefDraftScope,
  envelope: T
): void {
  try {
    localStorage.setItem(briefDraftStorageKey(briefId, scope), JSON.stringify(envelope))
  } catch (err) {
    logSilent('briefDraftStorage/write', err)
  }
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Reads and validates the envelope for the given brief + scope.
 * Returns `null` when:
 *  - no entry exists
 *  - `briefId` in the envelope doesn't match `activeBriefId`
 *  - the entry is older than `BRIEF_DRAFT_MAX_AGE_MS`
 *  - the JSON is corrupt / missing required fields
 */
export function readBriefDraft<T extends Envelope>(
  activeBriefId: string,
  scope: BriefDraftScope
): T | null {
  try {
    const raw = localStorage.getItem(briefDraftStorageKey(activeBriefId, scope))
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<T & { briefId: string; savedAt: number }>

    if (parsed.briefId !== activeBriefId) return null
    if (typeof parsed.savedAt !== 'number') return null
    if (Date.now() - parsed.savedAt > BRIEF_DRAFT_MAX_AGE_MS) {
      clearBriefDraft(activeBriefId, scope)
      return null
    }
    if (!parsed.draft) return null

    return parsed as T
  } catch (err) {
    logSilent('briefDraftStorage/read', err)
    return null
  }
}

// ─── Clear ────────────────────────────────────────────────────────────────────

export function clearBriefDraft(briefId: string, scope: BriefDraftScope): void {
  try {
    localStorage.removeItem(briefDraftStorageKey(briefId, scope))
  } catch (err) {
    logSilent('briefDraftStorage/clear', err)
  }
}

// ─── Convenience wrappers ─────────────────────────────────────────────────────

/**
 * NOTE: storage scope `'supervisor-reselect'` is kept as the literal key for
 * backward-compat with any in-flight drafts already stored in users'
 * browsers. The TypeScript symbols use the canonical `Alternative` name.
 */
export function writeSupervisorAlternativeDraft(
  briefId: string,
  draft: BriefSupervisorAlternativeEnvelope['draft'],
  briefStatus?: string
): void {
  writeBriefDraft<BriefSupervisorAlternativeEnvelope>(briefId, 'supervisor-reselect', {
    briefId,
    savedAt: Date.now(),
    briefStatus,
    draft,
  })
}

export function readSupervisorAlternativeDraft(
  activeBriefId: string
): BriefSupervisorAlternativeEnvelope | null {
  return readBriefDraft<BriefSupervisorAlternativeEnvelope>(activeBriefId, 'supervisor-reselect')
}

export function clearSupervisorAlternativeDraft(briefId: string): void {
  clearBriefDraft(briefId, 'supervisor-reselect')
}

// ─── Supervisor comments (Supervisor's in-progress brandCeoComments) ──────────

export function writeSupervisorCommentsDraft(
  briefId: string,
  comments: BrandCeoComments,
  briefStatus?: string
): void {
  writeBriefDraft<BriefSupervisorCommentsEnvelope>(briefId, 'supervisor-comments', {
    briefId,
    savedAt: Date.now(),
    briefStatus,
    draft: { commentsOverlay: comments },
  })
}

export function readSupervisorCommentsDraft(
  activeBriefId: string
): BriefSupervisorCommentsEnvelope | null {
  return readBriefDraft<BriefSupervisorCommentsEnvelope>(activeBriefId, 'supervisor-comments')
}

export function clearSupervisorCommentsDraft(briefId: string): void {
  clearBriefDraft(briefId, 'supervisor-comments')
}

export function writeAuthorRevisionDraft(
  briefId: string,
  draft: BriefAuthorRevisionEnvelope['draft'],
  briefStatus?: string
): void {
  writeBriefDraft<BriefAuthorRevisionEnvelope>(briefId, 'author-revision', {
    briefId,
    savedAt: Date.now(),
    briefStatus,
    draft,
  })
}

export function readAuthorRevisionDraft(
  activeBriefId: string
): BriefAuthorRevisionEnvelope | null {
  return readBriefDraft<BriefAuthorRevisionEnvelope>(activeBriefId, 'author-revision')
}

export function clearAuthorRevisionDraft(briefId: string): void {
  clearBriefDraft(briefId, 'author-revision')
}

export function writePreviewSlidesDraft(
  briefId: string,
  slideIndicesByConceptId: Record<string, number>
): void {
  writeBriefDraft<BriefPreviewSlidesEnvelope>(briefId, 'preview-slides', {
    briefId,
    savedAt: Date.now(),
    draft: { slideIndicesByConceptId },
  })
}

export function readPreviewSlidesDraft(
  activeBriefId: string
): BriefPreviewSlidesEnvelope | null {
  return readBriefDraft<BriefPreviewSlidesEnvelope>(activeBriefId, 'preview-slides')
}

export function clearPreviewSlidesDraft(briefId: string): void {
  clearBriefDraft(briefId, 'preview-slides')
}

