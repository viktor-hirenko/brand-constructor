import { logSilent } from '@/utils/log'
import { briefDraftStorageKey, type BriefDraftScope } from './briefDraftStorageKey'
import {
  BRIEF_DRAFT_MAX_AGE_MS,
  type BriefSupervisorReselectEnvelope,
  type BriefAuthorRevisionEnvelope,
} from './briefDraftEnvelope'

type Envelope = BriefSupervisorReselectEnvelope | BriefAuthorRevisionEnvelope

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

export function writeSupervisorReselectDraft(
  briefId: string,
  draft: BriefSupervisorReselectEnvelope['draft'],
  briefStatus?: string
): void {
  writeBriefDraft<BriefSupervisorReselectEnvelope>(briefId, 'supervisor-reselect', {
    briefId,
    savedAt: Date.now(),
    briefStatus,
    draft,
  })
}

export function readSupervisorReselectDraft(
  activeBriefId: string
): BriefSupervisorReselectEnvelope | null {
  return readBriefDraft<BriefSupervisorReselectEnvelope>(activeBriefId, 'supervisor-reselect')
}

export function clearSupervisorReselectDraft(briefId: string): void {
  clearBriefDraft(briefId, 'supervisor-reselect')
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

// ─── Aliases for useSupervisorAlternativeDraft ────────────────────────────────
// The dedicated Supervisor alternative-selection store uses the same localStorage
// scope as the reselect draft. These aliases keep the store's imports explicit
// without duplicating envelope logic.

export const writeSupervisorAlternativeDraft = writeSupervisorReselectDraft
export const readSupervisorAlternativeDraft = readSupervisorReselectDraft
export const clearSupervisorAlternativeDraft = clearSupervisorReselectDraft
