/**
 * Append-only brand workflow event types (brand_workflow_events.event_type).
 * Keep in sync with migrations and worker insertWorkflowEvent callers.
 */
export const BRAND_WORKFLOW_EVENT_TYPES = {
  CREATED: 'created',
  /** The author sent a brief with an order to the teams (`→ in_work`). */
  SENT_TO_WORK: 'sent_to_work',
  SUBMITTED: 'submitted',
  CEO_FEEDBACK: 'ceo_feedback',
  APPROVED: 'approved',
  CEO_SELECTION_UPDATE: 'ceo_selection_update',
  PO_COMMENT_RESOLVED: 'po_comment_resolved',
  /** Audit-only: written on resubmit, hidden in admin timeline UI. */
  RESUBMIT_CLEARED_CEO: 'resubmit_cleared_ceo',
  /** A Slack message of a status change was not delivered; meta names the channel. */
  SLACK_FAILED: 'slack_failed',
  /** A team pressed «Відправити замовнику» on the Orders page: what was ordered has been made. */
  ORDERS_READY: 'orders_ready',
  /** The author picked from the library instead of what was ordered; meta names the kind. */
  ORDER_CANCELLED: 'order_cancelled',
} as const

export type BrandWorkflowEventType =
  (typeof BRAND_WORKFLOW_EVENT_TYPES)[keyof typeof BRAND_WORKFLOW_EVENT_TYPES]

/** Admin History modal — human-readable event titles. */
export const BRAND_WORKFLOW_EVENT_LABELS: Record<BrandWorkflowEventType, string> = {
  [BRAND_WORKFLOW_EVENT_TYPES.CREATED]: 'Створено',
  [BRAND_WORKFLOW_EVENT_TYPES.SENT_TO_WORK]: 'Відправлено командам (в роботу)',
  [BRAND_WORKFLOW_EVENT_TYPES.SUBMITTED]: 'Надіслано на погодження',
  [BRAND_WORKFLOW_EVENT_TYPES.CEO_FEEDBACK]: 'Повернуто на доопрацювання',
  [BRAND_WORKFLOW_EVENT_TYPES.APPROVED]: 'Затверджено',
  [BRAND_WORKFLOW_EVENT_TYPES.CEO_SELECTION_UPDATE]: 'CEO змінив альтернативи',
  [BRAND_WORKFLOW_EVENT_TYPES.PO_COMMENT_RESOLVED]: 'Статус коментаря PO',
  [BRAND_WORKFLOW_EVENT_TYPES.RESUBMIT_CLEARED_CEO]: 'Повторно надіслано (зауваження CEO знято)',
  [BRAND_WORKFLOW_EVENT_TYPES.SLACK_FAILED]: 'Повідомлення в Slack не доставлено',
  [BRAND_WORKFLOW_EVENT_TYPES.ORDERS_READY]: 'Замовлення відправлено замовнику',
  [BRAND_WORKFLOW_EVENT_TYPES.ORDER_CANCELLED]: 'Замовлення скасовано (обрано з бібліотеки)',
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
  [BRIEF_SECTION_KEYS.VISUAL_COMPONENTS]: 'Interface components',
  [BRIEF_SECTION_KEYS.GENERAL]: 'General',
}

/**
 * The name of a brief section as the history shows it today.
 *
 * The worker writes the section's name of the day into every event
 * (`sectionLabel`), so a section that is renamed — DP-15450, «visual
 * components» → «Interface Components» — would keep the old name in every event
 * already in the base. The key is stored next to it: the key decides, and the
 * stored name is only for rows that have no key or a key nobody knows.
 */
export function briefSectionLabel(section: unknown, stored?: string): string {
  if (typeof section === 'string' && Object.prototype.hasOwnProperty.call(BRIEF_SECTION_LABELS, section)) {
    return BRIEF_SECTION_LABELS[section as BriefSectionKey]
  }
  return stored ?? (typeof section === 'string' ? section : '')
}
