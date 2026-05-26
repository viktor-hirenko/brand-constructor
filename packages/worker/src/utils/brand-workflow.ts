import type { D1Database } from '@cloudflare/workers-types'
import {
  BRAND_BRIEF_STATUS,
  BRAND_WORKFLOW_EVENT_TYPES,
  BRIEF_SECTION_LABELS,
  type BrandWorkflowEventType,
} from '@brand-constructor/shared'
import type { BrandStatus, CeoCommentMeta } from '@brand-constructor/shared/types'
import type {
  SubmittedSelectionSnapshot,
  WorkflowCommentEntry,
  WorkflowPoCommentEntry,
  WorkflowSelectionChange,
  WorkflowSelectionEntry,
} from '@brand-constructor/shared/types'
import { generateId } from './id'
import {
  asIdArray,
  firstId,
  normaliseCeoCommentsForStorage,
  type BrandRow,
} from './brands'

/** @deprecated Prefer `BRAND_WORKFLOW_EVENT_TYPES` from shared — kept for worker imports. */
export const WORKFLOW_EVENT_TYPES = BRAND_WORKFLOW_EVENT_TYPES

export type WorkflowEventType = BrandWorkflowEventType

export type {
  SubmittedSelectionSnapshot,
  WorkflowCommentEntry,
  WorkflowPoCommentEntry,
  WorkflowSelectionChange,
  WorkflowSelectionEntry,
} from '@brand-constructor/shared/types'

const EXCERPT_MAX = 120

const PO_COMMENT_SECTIONS: { section: string; label: string; column: keyof BrandRow }[] = [
  { section: 'concept', label: 'Concept', column: 'concept_comment' },
  { section: 'externalNaming', label: 'External naming', column: 'external_naming_comment' },
  { section: 'internalNaming', label: 'Internal naming', column: 'internal_naming_comment' },
  { section: 'marketingPackage', label: 'Marketing package', column: 'pr_package_comment' },
  { section: 'deliverables', label: 'Deliverables', column: 'deliverables_comment' },
  { section: 'visualComponents', label: 'Visual components', column: 'components_comment' },
]

export interface BrandWorkflowEventRow {
  id: string
  brand_id: string
  event_type: string
  user_id: string
  created_at: string
  meta: string
  user_name?: string
  user_role?: string
}

/** Appends snapshot column updates for `PATCH /:id/status`. */
export function appendWorkflowSnapshot(
  targetStatus: BrandStatus,
  currentStatus: BrandStatus,
  userId: string,
  existing: BrandRow,
  now: string,
  updates: string[],
  values: (string | number | null)[]
): void {
  if (targetStatus === BRAND_BRIEF_STATUS.SUBMITTED) {
    updates.push('submitted_at = ?', 'submitted_by = ?', 'submit_count = ?')
    const nextCount = (existing.submit_count ?? 0) + 1
    values.push(now, userId, nextCount)
  }
  if (targetStatus === BRAND_BRIEF_STATUS.APPROVED) {
    updates.push('approved_at = ?', 'approved_by = ?')
    values.push(now, userId)
  }
  if (targetStatus === BRAND_BRIEF_STATUS.NEEDS_REVISION) {
    updates.push('needs_revision_at = ?', 'needs_revision_by = ?')
    values.push(now, userId)
  }
}

export function prepareWorkflowEventStatement(
  brandId: string,
  eventType: WorkflowEventType,
  userId: string,
  meta: Record<string, unknown>,
  createdAt?: string
) {
  const id = generateId('bwe')
  const at = createdAt ?? new Date().toISOString()
  return {
    id,
    statement: {
      sql: `INSERT INTO brand_workflow_events (id, brand_id, event_type, user_id, created_at, meta)
            VALUES (?, ?, ?, ?, ?, ?)`,
      bindings: [id, brandId, eventType, userId, at, JSON.stringify(meta)] as (
        | string
        | number
        | null
      )[],
    },
  }
}

export async function insertWorkflowEvent(
  db: D1Database,
  brandId: string,
  eventType: WorkflowEventType,
  userId: string,
  meta: Record<string, unknown>
): Promise<void> {
  const { statement } = prepareWorkflowEventStatement(brandId, eventType, userId, meta)
  await db
    .prepare(statement.sql)
    .bind(...statement.bindings)
    .run()
}

async function resolveConceptName(db: D1Database, id: string | null): Promise<string | null> {
  if (!id) return null
  const row = await db.prepare('SELECT name FROM concepts WHERE id = ?').bind(id).first<{ name: string }>()
  return row?.name ?? null
}

async function resolveExternalNamingNames(db: D1Database, ids: string[]): Promise<string[]> {
  if (ids.length === 0) return []
  const placeholders = ids.map(() => '?').join(',')
  const rows = await db
    .prepare(`SELECT name FROM external_namings WHERE id IN (${placeholders})`)
    .bind(...ids)
    .all<{ name: string }>()
  return rows.results.map(r => r.name)
}

async function resolveInternalNamingName(db: D1Database, id: string | null): Promise<string | null> {
  if (!id) return null
  const row = await db
    .prepare('SELECT name FROM internal_namings WHERE id = ?')
    .bind(id)
    .first<{ name: string }>()
  return row?.name ?? null
}

async function resolvePrPackageName(db: D1Database, id: string | null): Promise<string | null> {
  if (!id) return null
  const row = await db
    .prepare('SELECT name FROM pr_packages WHERE id = ?')
    .bind(id)
    .first<{ name: string }>()
  return row?.name ?? null
}

function parseExternalNamingIds(row: BrandRow): string[] {
  try {
    return JSON.parse(row.external_naming_ids || '[]') as string[]
  } catch {
    return []
  }
}

export function buildPoCommentsFromRow(row: BrandRow): Record<string, string> {
  const out: Record<string, string> = {}
  for (const { section, column } of PO_COMMENT_SECTIONS) {
    const raw = row[column]
    out[section] = typeof raw === 'string' ? raw : ''
  }
  return out
}

export async function buildPoSelectionSnapshot(
  db: D1Database,
  row: BrandRow
): Promise<SubmittedSelectionSnapshot> {
  const extIds = parseExternalNamingIds(row)
  const [concept, externalNames, internalNaming, marketingPackage] = await Promise.all([
    resolveConceptName(db, row.concept_id),
    resolveExternalNamingNames(db, extIds),
    resolveInternalNamingName(db, row.internal_naming_id),
    resolvePrPackageName(db, row.pr_package_id),
  ])
  return {
    concept,
    externalNaming: externalNames.length > 0 ? externalNames.join(', ') : null,
    internalNaming,
    marketingPackage,
  }
}

export function buildSubmittedSelectionChanges(
  previous: SubmittedSelectionSnapshot | null,
  current: SubmittedSelectionSnapshot
): WorkflowSelectionChange[] {
  const fields: { field: string; fieldLabel: string; key: keyof SubmittedSelectionSnapshot }[] = [
    { field: 'concept', fieldLabel: 'Concept', key: 'concept' },
    { field: 'externalNaming', fieldLabel: 'External naming', key: 'externalNaming' },
    { field: 'internalNaming', fieldLabel: 'Internal naming', key: 'internalNaming' },
    { field: 'marketingPackage', fieldLabel: 'Marketing package', key: 'marketingPackage' },
  ]
  const changes: WorkflowSelectionChange[] = []
  for (const f of fields) {
    const fromName = previous?.[f.key] ?? null
    const toName = current[f.key]
    if (!fromName && !toName) continue
    if (fromName !== toName) {
      changes.push({ field: f.field, fieldLabel: f.fieldLabel, fromName, toName })
    }
  }
  return changes
}

export function buildPoCommentUpdates(
  previous: Record<string, string>,
  current: Record<string, string>
): WorkflowPoCommentEntry[] {
  const out: WorkflowPoCommentEntry[] = []
  for (const { section, label } of PO_COMMENT_SECTIONS) {
    const cur = (current[section] ?? '').trim()
    const prevText = (previous[section] ?? '').trim()
    if (!cur) continue
    if (prevText === cur) continue
    const entry: WorkflowPoCommentEntry = {
      section,
      sectionLabel: label,
      excerpt: excerpt(cur),
    }
    if (prevText) entry.fromExcerpt = excerpt(prevText)
    out.push(entry)
  }
  return out
}

function snapshotFromLegacySummary(summary: Record<string, unknown>): SubmittedSelectionSnapshot {
  return {
    concept: typeof summary.concept === 'string' ? summary.concept : null,
    externalNaming:
      typeof summary.externalNaming === 'string' ? summary.externalNaming : null,
    internalNaming:
      typeof summary.internalNaming === 'string' ? summary.internalNaming : null,
    marketingPackage:
      typeof summary.marketingPackage === 'string' ? summary.marketingPackage : null,
  }
}

function poCommentsFromPreviousMeta(prevMeta: Record<string, unknown> | null): Record<string, string> {
  if (!prevMeta) return {}
  const list = prevMeta.poComments
  if (!Array.isArray(list)) return {}
  const out: Record<string, string> = {}
  for (const item of list) {
    if (typeof item !== 'object' || item === null || !('section' in item)) continue
    const section = String((item as WorkflowPoCommentEntry).section)
    const excerpt = String((item as WorkflowPoCommentEntry).excerpt ?? '')
    out[section] = excerpt
  }
  return out
}

/** Full PO comments at previous submit; falls back to legacy delta-only meta. */
export function poCommentsFromPreviousSubmit(
  prevMeta: Record<string, unknown> | null
): Record<string, string> {
  if (!prevMeta) return {}
  const snap = prevMeta.commentSnapshot
  if (snap && typeof snap === 'object' && !Array.isArray(snap)) {
    const out: Record<string, string> = {}
    for (const [section, raw] of Object.entries(snap as Record<string, unknown>)) {
      if (typeof raw === 'string') out[section] = raw
    }
    return out
  }
  return poCommentsFromPreviousMeta(prevMeta)
}

async function fetchPreviousSubmittedMeta(
  db: D1Database,
  brandId: string
): Promise<Record<string, unknown> | null> {
  const row = await db
    .prepare(
      `SELECT meta FROM brand_workflow_events
       WHERE brand_id = ? AND event_type = ?
       ORDER BY created_at DESC LIMIT 1`
    )
    .bind(brandId, WORKFLOW_EVENT_TYPES.SUBMITTED)
    .first<{ meta: string }>()
  if (!row) return null
  return parseWorkflowEventMeta(row.meta)
}

function excerpt(text: string): string {
  const t = text.trim()
  if (t.length <= EXCERPT_MAX) return t
  return `${t.slice(0, EXCERPT_MAX)}…`
}

export function buildCommentsMeta(
  ceoCommentsRaw: Record<string, string | CeoCommentMeta> | undefined
): WorkflowCommentEntry[] {
  if (!ceoCommentsRaw) return []
  const normalised = normaliseCeoCommentsForStorage(ceoCommentsRaw)
  const out: WorkflowCommentEntry[] = []
  for (const [section, meta] of Object.entries(normalised)) {
    const value = meta.value?.trim()
    if (!value) continue
    out.push({
      section,
      sectionLabel: BRIEF_SECTION_LABELS[section as keyof typeof BRIEF_SECTION_LABELS] ?? section,
      excerpt: excerpt(value),
    })
  }
  return out
}

export async function buildSelectionChangesMeta(
  db: D1Database,
  existing: BrandRow,
  ceoSelections: Record<string, string | string[]>
): Promise<WorkflowSelectionChange[]> {
  const changes: WorkflowSelectionChange[] = []

  const ceoConceptId = firstId(ceoSelections.concept)
  if (ceoConceptId && ceoConceptId !== existing.concept_id) {
    const [fromName, toName] = await Promise.all([
      resolveConceptName(db, existing.concept_id),
      resolveConceptName(db, ceoConceptId),
    ])
    changes.push({
      field: 'concept',
      fieldLabel: 'Concept',
      fromName,
      toName,
    })
  }

  const ceoExtIds = asIdArray(ceoSelections.externalNaming)
  let poExtIds: string[] = []
  try {
    poExtIds = JSON.parse(existing.external_naming_ids || '[]')
  } catch {
    poExtIds = []
  }
  if (ceoExtIds.length > 0 && JSON.stringify(ceoExtIds.sort()) !== JSON.stringify([...poExtIds].sort())) {
    const [fromNames, toNames] = await Promise.all([
      resolveExternalNamingNames(db, poExtIds),
      resolveExternalNamingNames(db, ceoExtIds),
    ])
    changes.push({
      field: 'externalNaming',
      fieldLabel: 'External naming',
      fromName: fromNames.length ? fromNames.join(', ') : null,
      toName: toNames.length ? toNames.join(', ') : null,
    })
  }

  const ceoIntId = firstId(ceoSelections.internalNaming)
  if (ceoIntId && ceoIntId !== existing.internal_naming_id) {
    const [fromName, toName] = await Promise.all([
      resolveInternalNamingName(db, existing.internal_naming_id),
      resolveInternalNamingName(db, ceoIntId),
    ])
    changes.push({
      field: 'internalNaming',
      fieldLabel: 'Internal naming',
      fromName,
      toName,
    })
  }

  return changes
}

export async function buildFinalSelectionsMeta(
  db: D1Database,
  existing: BrandRow,
  ceoSelections: Record<string, string | string[]>
): Promise<WorkflowSelectionEntry[]> {
  const entries: WorkflowSelectionEntry[] = []

  const conceptId = firstId(ceoSelections.concept) || existing.concept_id
  if (conceptId) {
    const name = await resolveConceptName(db, conceptId)
    if (name) entries.push({ field: 'concept', fieldLabel: 'Concept', name })
  }

  const extIds = asIdArray(ceoSelections.externalNaming)
  const finalExtIds =
    extIds.length > 0
      ? extIds
      : (() => {
          try {
            return JSON.parse(existing.external_naming_ids || '[]') as string[]
          } catch {
            return []
          }
        })()
  if (finalExtIds.length > 0) {
    const names = await resolveExternalNamingNames(db, finalExtIds)
    if (names.length) {
      entries.push({
        field: 'externalNaming',
        fieldLabel: 'External naming',
        name: names.join(', '),
      })
    }
  }

  const intId = firstId(ceoSelections.internalNaming) || existing.internal_naming_id
  if (intId) {
    const name = await resolveInternalNamingName(db, intId)
    if (name) entries.push({ field: 'internalNaming', fieldLabel: 'Internal naming', name })
  }

  return entries
}

export async function buildSubmittedSummaryMeta(
  db: D1Database,
  brandId: string,
  existing: BrandRow,
  submitCount: number,
  currentStatus: BrandStatus
): Promise<Record<string, unknown>> {
  const isResubmit = currentStatus === BRAND_BRIEF_STATUS.NEEDS_REVISION
  const currentSnapshot = await buildPoSelectionSnapshot(db, existing)
  const currentComments = buildPoCommentsFromRow(existing)

  const prevMeta = submitCount > 1 ? await fetchPreviousSubmittedMeta(db, brandId) : null
  const prevSummary =
    prevMeta?.summary && typeof prevMeta.summary === 'object'
      ? snapshotFromLegacySummary(prevMeta.summary as Record<string, unknown>)
      : null
  const prevComments = poCommentsFromPreviousSubmit(prevMeta)

  // First submit: no prior snapshot — avoid "Set to …" noise in History UI.
  const changes =
    submitCount > 1 ? buildSubmittedSelectionChanges(prevSummary, currentSnapshot) : []
  const poComments = buildPoCommentUpdates(prevComments, currentComments)

  return {
    submitCount,
    isResubmit,
    summary: currentSnapshot,
    commentSnapshot: currentComments,
    changes,
    poComments,
  }
}

export async function buildCeoFeedbackEventMeta(
  db: D1Database,
  existing: BrandRow,
  ceoCommentsRaw: Record<string, string | CeoCommentMeta> | undefined,
  ceoSelections: Record<string, string | string[]> | undefined
): Promise<Record<string, unknown>> {
  const comments = buildCommentsMeta(ceoCommentsRaw)
  const selections = ceoSelections
    ? await buildSelectionChangesMeta(db, existing, ceoSelections)
    : []
  return { comments, selections }
}

export function buildPoCommentResolvedMeta(section: string, resolved: boolean): Record<string, unknown> {
  return {
    section,
    sectionLabel: BRIEF_SECTION_LABELS[section as keyof typeof BRIEF_SECTION_LABELS] ?? section,
    resolved,
  }
}

export function parseWorkflowEventMeta(metaJson: string): Record<string, unknown> {
  try {
    return JSON.parse(metaJson) as Record<string, unknown>
  } catch {
    return {}
  }
}

export function getExistingCeoSelections(row: BrandRow): Record<string, string | string[]> {
  try {
    return JSON.parse(row.ceo_selections || '{}') as Record<string, string | string[]>
  } catch {
    return {}
  }
}

/** Summary line for admin list Review column (needs_revision). */
export function buildFeedbackSummaryLine(meta: Record<string, unknown>): string | null {
  const comments = meta.comments as WorkflowCommentEntry[] | undefined
  const selections = meta.selections as WorkflowSelectionChange[] | undefined
  const parts: string[] = []
  if (selections?.length) {
    parts.push(
      selections.length === 1 ? '1 alternative' : `${selections.length} alternatives`
    )
  }
  if (comments?.length) {
    parts.push(
      comments.length === 1 ? '1 comment' : `${comments.length} comments`
    )
  }
  return parts.length ? parts.join(' · ') : null
}

export async function recordStatusWorkflowEvents(
  db: D1Database,
  opts: {
    brandId: string
    userId: string
    targetStatus: BrandStatus
    currentStatus: BrandStatus
    existing: BrandRow
    ceoComments?: Record<string, string | CeoCommentMeta>
    ceoSelections?: Record<string, string | string[]>
  }
): Promise<void> {
  const { brandId, userId, targetStatus, currentStatus, existing, ceoComments, ceoSelections } =
    opts

  if (targetStatus === BRAND_BRIEF_STATUS.SUBMITTED) {
    const submitCount = (existing.submit_count ?? 0) + 1
    const meta = await buildSubmittedSummaryMeta(
      db,
      brandId,
      existing,
      submitCount,
      currentStatus
    )
    await insertWorkflowEvent(db, brandId, WORKFLOW_EVENT_TYPES.SUBMITTED, userId, meta)
    if (currentStatus === BRAND_BRIEF_STATUS.NEEDS_REVISION) {
      await insertWorkflowEvent(db, brandId, WORKFLOW_EVENT_TYPES.RESUBMIT_CLEARED_CEO, userId, {
        clearedCeoFeedback: true,
      })
    }
  }

  if (targetStatus === BRAND_BRIEF_STATUS.NEEDS_REVISION) {
    const meta = await buildCeoFeedbackEventMeta(db, existing, ceoComments, ceoSelections)
    await insertWorkflowEvent(db, brandId, WORKFLOW_EVENT_TYPES.CEO_FEEDBACK, userId, meta)
  }

  if (targetStatus === BRAND_BRIEF_STATUS.APPROVED) {
    const effectiveSel = ceoSelections ?? getExistingCeoSelections(existing)
    const selections = await buildFinalSelectionsMeta(db, existing, effectiveSel)
    await insertWorkflowEvent(db, brandId, WORKFLOW_EVENT_TYPES.APPROVED, userId, { selections })
  }
}

export async function fetchLatestCeoFeedbackSummary(
  db: D1Database,
  brandId: string
): Promise<string | null> {
  const row = await db
    .prepare(
      `SELECT meta FROM brand_workflow_events
       WHERE brand_id = ? AND event_type = ?
       ORDER BY created_at DESC LIMIT 1`
    )
    .bind(brandId, WORKFLOW_EVENT_TYPES.CEO_FEEDBACK)
    .first<{ meta: string }>()
  if (!row) return null
  return buildFeedbackSummaryLine(parseWorkflowEventMeta(row.meta))
}
