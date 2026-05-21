export type BrandStatus = 'draft' | 'submitted' | 'needs_revision' | 'approved'

export interface BrandBasicsData {
  geo: string[]
  launchDate: string
  linkedProduct: string
  comment: string
}

export interface BrandConceptData {
  selectedId: string | null
  /** Runtime-only preview in grid (not persisted when saving brand). */
  previewId?: string | null
  comment: string
  newConceptBrief: NewConceptBrief | null
}

export interface NewConceptBrief {
  isNewGeo: boolean | null
  geoInfo: string
  needsGeoResearch: boolean | null
  conceptFeedback: string
  trafficTeamInfo: string
  competitors: string
  keepProductConnection: boolean | null
  connectedProducts: string
  namingLanguage: string
  desiredWordsInName: string
  domainZones: string[]
  domainBudget: number | null
  namingDeadline: string
  additionalGeoInfo: string
}

export interface NewNamingBrief {
  isNewGeo: boolean | null
  namingFeedback: string
  trafficTeamInfo: string
  needsGeoResearch: boolean | null
  namingLanguage: string
  desiredWordsInName: string
  domainZones: string[]
  wordsToAvoid: string
  domainBudget: number | null
  namingDeadline: string
  additionalGeoInfo: string
}

export interface BrandExternalNamingData {
  selectedIds: string[]
  comment: string
  newNamingBrief: NewNamingBrief | null
}

export interface BrandInternalNamingData {
  selectedId: string | null
  comment: string
  newNamingFeedback: string | null
}

export interface BrandMarketingPackageData {
  selectedId: string | null
  comment: string
}

export interface BrandDeliverablesData {
  legalLanding: boolean
  partnerLanding: boolean
  developmentDeadline: string
  comment: string
}

export interface BrandVisualComponentsData {
  selections: Record<string, string>
  delegateToDesigners: boolean
  comment: string
}

/**
 * CEO comment per section after returning a brief for revision.
 *
 * Stored under `brand.ceo_comments[sectionKey]` as JSON. The legacy storage
 * shape was a plain string; new code always reads/writes the meta object.
 * Worker `rowToBrand` migrates legacy strings on read so the frontend never
 * sees the bare string form.
 */
export interface CeoCommentMeta {
  /** Raw text written by CEO. Empty string means no comment for the section. */
  value: string
  /**
   * `true` after the brief owner (PO) marks the comment as resolved on the
   * returned-from-CEO view. Reset to `false` on unresolve / "Повернути".
   */
  resolved: boolean
  /** ISO timestamp of the last resolve/unresolve transition. */
  resolvedAt: string | null
}

/**
 * Mapping `sectionKey → CeoCommentMeta`. Section keys mirror the constructor
 * step slices (`basics`, `concept`, `externalNaming`, `internalNaming`,
 * `marketingPackage`, `deliverables`, `visualComponents`) plus `general` for
 * the bottom "Загальний коментар CEO" field (which has no resolved state but
 * is stored in the same map for simplicity).
 */
export type BrandCeoComments = Record<string, CeoCommentMeta>

export interface BrandStepData {
  /**
   * Layout version of the constructor flow this draft belongs to.
   *   - omitted = legacy 10-step drafts from DB (with separate Mode + Brand Preview).
   *   - 1 = 9-step flow after Mode was merged into Concept Selection.
   *   - 2 = current 8-step flow after Brand Preview step was removed.
   */
  stepLayoutVersion?: 1 | 2
  brandBasics: BrandBasicsData
  mode: 'light' | 'dark' | null
  concept: BrandConceptData
  externalNaming: BrandExternalNamingData
  internalNaming: BrandInternalNamingData
  marketingPackage: BrandMarketingPackageData
  deliverables: BrandDeliverablesData
  visualComponents: BrandVisualComponentsData
}

export interface Brand {
  id: string
  internalName: string | null
  status: BrandStatus
  createdBy: string
  geo: string | null
  launchDate: string | null
  mode: 'light' | 'dark' | null
  conceptId: string | null
  conceptComment: string | null
  externalNamingIds: string[]
  externalNamingComment: string | null
  internalNamingId: string | null
  internalNamingComment: string | null
  prPackageId: string | null
  prPackageComment: string | null
  legalLanding: boolean
  partnerLanding: boolean
  deliverablesComment: string | null
  componentSelections: Record<string, string>
  componentsComment: string | null
  delegateToDesigners: boolean
  newConceptBrief: NewConceptBrief | null
  ceoComments: BrandCeoComments | null
  ceoSelections: Record<string, string | string[]> | null
  developmentDeadline: string | null
  newNamingBrief: NewNamingBrief | null
  stepData: BrandStepData | null
  currentStep: number
  createdAt: string
  updatedAt: string
}

export interface CreateBrandPayload {
  internalName?: string
}

export interface UpdateBrandPayload {
  internalName?: string
  geo?: string
  launchDate?: string
  mode?: 'light' | 'dark'
  conceptId?: string
  conceptComment?: string
  externalNamingIds?: string[]
  externalNamingComment?: string
  internalNamingId?: string
  internalNamingComment?: string
  prPackageId?: string
  prPackageComment?: string
  legalLanding?: boolean
  partnerLanding?: boolean
  deliverablesComment?: string
  componentSelections?: Record<string, string>
  componentsComment?: string
  delegateToDesigners?: boolean
  newConceptBrief?: NewConceptBrief
  developmentDeadline?: string
  newNamingBrief?: NewNamingBrief
  stepData?: BrandStepData
  currentStep?: number
}

/**
 * Wire format accepted by `PATCH /api/brands/:id/status`.
 *
 * `ceoComments` accepts either the modern meta object or the legacy plain
 * string (for backward-compat with older clients). The worker normalises to
 * `CeoCommentMeta` before persisting.
 */
export interface UpdateBrandStatusPayload {
  status: BrandStatus
  ceoComments?: Record<string, string | CeoCommentMeta>
  ceoSelections?: Record<string, string | string[]>
}

/** Payload for `PATCH /api/brands/:id/ceo-comments/resolve`. */
export interface UpdateCeoCommentResolvedPayload {
  section: string
  resolved: boolean
}
