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
