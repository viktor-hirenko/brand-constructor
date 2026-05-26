/**
 * JSON `meta` shapes for `brand_workflow_events`.
 * Worker writes these; admin History modal parses them (legacy rows may be partial).
 */

export interface WorkflowSelectionChange {
  field: string
  fieldLabel: string
  fromName: string | null
  toName: string | null
}

export interface WorkflowCommentEntry {
  section: string
  sectionLabel: string
  excerpt: string
}

export interface WorkflowPoCommentEntry {
  section: string
  sectionLabel: string
  excerpt: string
  fromExcerpt?: string | null
}

export interface WorkflowSelectionFinal {
  field: string
  fieldLabel: string
  name: string
}

/** @deprecated Use WorkflowSelectionFinal */
export type WorkflowSelectionEntry = WorkflowSelectionFinal

/** Resolved PO brief choices at submit time (display names, not ids). */
export interface SubmittedSelectionSnapshot {
  concept: string | null
  externalNaming: string | null
  internalNaming: string | null
  marketingPackage: string | null
}

/** @deprecated Early submitted meta included brand/geo labels */
export interface LegacySubmittedSnapshot extends SubmittedSelectionSnapshot {
  internalName?: string | null
  geo?: string | null
}

export interface SubmittedEventMeta {
  submitCount: number
  isResubmit: boolean
  summary: SubmittedSelectionSnapshot
  commentSnapshot?: Record<string, string>
  changes: WorkflowSelectionChange[]
  poComments: WorkflowPoCommentEntry[]
}

export interface CeoFeedbackEventMeta {
  comments: WorkflowCommentEntry[]
  selections: WorkflowSelectionChange[]
}

export interface ApprovedEventMeta {
  selections: WorkflowSelectionFinal[]
}

export interface PoCommentResolvedEventMeta {
  section: string
  sectionLabel: string
  resolved: boolean
}

export interface CeoSelectionUpdateEventMeta {
  selections: WorkflowSelectionChange[]
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

export function isWorkflowSelectionChange(v: unknown): v is WorkflowSelectionChange {
  return (
    isRecord(v) &&
    typeof v.fieldLabel === 'string' &&
    ('fromName' in v || 'toName' in v)
  )
}

export function isWorkflowPoCommentEntry(v: unknown): v is WorkflowPoCommentEntry {
  return isRecord(v) && typeof v.sectionLabel === 'string' && typeof v.excerpt === 'string'
}

export function isWorkflowCommentEntry(v: unknown): v is WorkflowCommentEntry {
  return isRecord(v) && typeof v.sectionLabel === 'string' && typeof v.excerpt === 'string'
}

export function isWorkflowSelectionFinal(v: unknown): v is WorkflowSelectionFinal {
  return isRecord(v) && typeof v.fieldLabel === 'string' && typeof v.name === 'string'
}

export function parseSubmittedSelectionSnapshot(v: unknown): SubmittedSelectionSnapshot | null {
  if (!isRecord(v)) return null
  return {
    concept: typeof v.concept === 'string' ? v.concept : null,
    externalNaming: typeof v.externalNaming === 'string' ? v.externalNaming : null,
    internalNaming: typeof v.internalNaming === 'string' ? v.internalNaming : null,
    marketingPackage: typeof v.marketingPackage === 'string' ? v.marketingPackage : null,
  }
}

export function parseLegacySubmittedSnapshot(v: unknown): LegacySubmittedSnapshot | null {
  const base = parseSubmittedSelectionSnapshot(v)
  if (!base) return null
  if (!isRecord(v)) return base
  return {
    ...base,
    internalName: typeof v.internalName === 'string' ? v.internalName : null,
    geo: typeof v.geo === 'string' ? v.geo : null,
  }
}

export function parseWorkflowSelectionChanges(v: unknown): WorkflowSelectionChange[] {
  if (!Array.isArray(v)) return []
  return v.filter(isWorkflowSelectionChange)
}

export function parseWorkflowPoComments(v: unknown): WorkflowPoCommentEntry[] {
  if (!Array.isArray(v)) return []
  return v.filter(isWorkflowPoCommentEntry)
}

export function parseWorkflowCommentEntries(v: unknown): WorkflowCommentEntry[] {
  if (!Array.isArray(v)) return []
  return v.filter(isWorkflowCommentEntry)
}

export function parseWorkflowSelectionFinals(v: unknown): WorkflowSelectionFinal[] {
  if (!Array.isArray(v)) return []
  return v.filter(isWorkflowSelectionFinal)
}

export function parseSubmittedEventMeta(meta: Record<string, unknown>): SubmittedEventMeta | null {
  const summary = parseSubmittedSelectionSnapshot(meta.summary)
  if (!summary) return null
  const submitCount = typeof meta.submitCount === 'number' ? meta.submitCount : 1
  return {
    submitCount,
    isResubmit: meta.isResubmit === true,
    summary,
    commentSnapshot:
      isRecord(meta.commentSnapshot) && !Array.isArray(meta.commentSnapshot)
        ? Object.fromEntries(
            Object.entries(meta.commentSnapshot).filter(
              (entry): entry is [string, string] => typeof entry[1] === 'string'
            )
          )
        : undefined,
    changes: parseWorkflowSelectionChanges(meta.changes),
    poComments: parseWorkflowPoComments(meta.poComments),
  }
}

export function parseCeoFeedbackEventMeta(meta: Record<string, unknown>): CeoFeedbackEventMeta {
  return {
    comments: parseWorkflowCommentEntries(meta.comments),
    selections: parseWorkflowSelectionChanges(meta.selections),
  }
}

export function parsePoCommentResolvedEventMeta(
  meta: Record<string, unknown>
): PoCommentResolvedEventMeta {
  return {
    section: typeof meta.section === 'string' ? meta.section : '',
    sectionLabel:
      typeof meta.sectionLabel === 'string'
        ? meta.sectionLabel
        : String(meta.section ?? 'Section'),
    resolved: meta.resolved !== false,
  }
}
