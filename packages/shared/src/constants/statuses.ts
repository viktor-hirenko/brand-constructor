export const ENTITY_STATUSES = {
  ACTIVE: 'active',
  ARCHIVED: 'archived',
  USED: 'used',
  DRAFT: 'draft',
} as const;

export const STATUS_LABELS: Record<string, string> = {
  [ENTITY_STATUSES.ACTIVE]: 'Active',
  [ENTITY_STATUSES.ARCHIVED]: 'Archived',
  [ENTITY_STATUSES.USED]: 'Used in Brand',
  [ENTITY_STATUSES.DRAFT]: 'Draft',
};

/**
 * Canonical brief lifecycle statuses.
 * Mirrors `STATUS_TRANSITIONS` on the worker — never add a value here
 * without a corresponding server-side transition rule.
 */
export const BRAND_BRIEF_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  NEEDS_REVISION: 'needs_revision',
  APPROVED: 'approved',
} as const;

export type BrandBriefStatus = (typeof BRAND_BRIEF_STATUS)[keyof typeof BRAND_BRIEF_STATUS];

/**
 * Client-side mirror of the server's `STATUS_TRANSITIONS` map.
 * Use to validate or disable UI controls before issuing a PATCH request.
 */
export const BRAND_BRIEF_STATUS_TRANSITIONS: Record<BrandBriefStatus, readonly BrandBriefStatus[]> = {
  [BRAND_BRIEF_STATUS.DRAFT]: [BRAND_BRIEF_STATUS.SUBMITTED],
  [BRAND_BRIEF_STATUS.SUBMITTED]: [BRAND_BRIEF_STATUS.APPROVED, BRAND_BRIEF_STATUS.NEEDS_REVISION],
  [BRAND_BRIEF_STATUS.NEEDS_REVISION]: [BRAND_BRIEF_STATUS.SUBMITTED, BRAND_BRIEF_STATUS.APPROVED],
  [BRAND_BRIEF_STATUS.APPROVED]: [],
};
