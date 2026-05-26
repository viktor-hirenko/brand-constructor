/**
 * Append-only brand workflow event types (brand_workflow_events.event_type).
 * Keep in sync with migrations and worker insertWorkflowEvent callers.
 */
export const BRAND_WORKFLOW_EVENT_TYPES = {
  CREATED: 'created',
  SUBMITTED: 'submitted',
  CEO_FEEDBACK: 'ceo_feedback',
  APPROVED: 'approved',
  CEO_SELECTION_UPDATE: 'ceo_selection_update',
  PO_COMMENT_RESOLVED: 'po_comment_resolved',
  /** Audit-only: written on resubmit, hidden in admin timeline UI. */
  RESUBMIT_CLEARED_CEO: 'resubmit_cleared_ceo',
} as const

export type BrandWorkflowEventType =
  (typeof BRAND_WORKFLOW_EVENT_TYPES)[keyof typeof BRAND_WORKFLOW_EVENT_TYPES]

/** Admin History modal — human-readable event titles. */
export const BRAND_WORKFLOW_EVENT_LABELS: Record<BrandWorkflowEventType, string> = {
  [BRAND_WORKFLOW_EVENT_TYPES.CREATED]: 'Created',
  [BRAND_WORKFLOW_EVENT_TYPES.SUBMITTED]: 'Submitted for review',
  [BRAND_WORKFLOW_EVENT_TYPES.CEO_FEEDBACK]: 'Sent back for revision',
  [BRAND_WORKFLOW_EVENT_TYPES.APPROVED]: 'Approved',
  [BRAND_WORKFLOW_EVENT_TYPES.CEO_SELECTION_UPDATE]: 'CEO updated alternatives',
  [BRAND_WORKFLOW_EVENT_TYPES.PO_COMMENT_RESOLVED]: 'PO comment status',
  [BRAND_WORKFLOW_EVENT_TYPES.RESUBMIT_CLEARED_CEO]: 'Resubmitted (CEO feedback cleared)',
}

/** Brief section keys used in CEO comments, PO comments, and workflow meta. */
export const BRIEF_SECTION_KEYS = {
  BASICS: 'basics',
  CONCEPT: 'concept',
  EXTERNAL_NAMING: 'externalNaming',
  INTERNAL_NAMING: 'internalNaming',
  MARKETING_PACKAGE: 'marketingPackage',
  DELIVERABLES: 'deliverables',
  VISUAL_COMPONENTS: 'visualComponents',
  GENERAL: 'general',
} as const

export type BriefSectionKey = (typeof BRIEF_SECTION_KEYS)[keyof typeof BRIEF_SECTION_KEYS]

export const BRIEF_SECTION_LABELS: Record<BriefSectionKey, string> = {
  [BRIEF_SECTION_KEYS.BASICS]: 'Basics',
  [BRIEF_SECTION_KEYS.CONCEPT]: 'Concept',
  [BRIEF_SECTION_KEYS.EXTERNAL_NAMING]: 'External naming',
  [BRIEF_SECTION_KEYS.INTERNAL_NAMING]: 'Internal naming',
  [BRIEF_SECTION_KEYS.MARKETING_PACKAGE]: 'Marketing package',
  [BRIEF_SECTION_KEYS.DELIVERABLES]: 'Deliverables',
  [BRIEF_SECTION_KEYS.VISUAL_COMPONENTS]: 'Visual components',
  [BRIEF_SECTION_KEYS.GENERAL]: 'General',
}
