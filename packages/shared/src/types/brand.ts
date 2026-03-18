export type BrandStatus = 'draft' | 'submitted' | 'needs_revision' | 'approved' | 'rejected'

export interface BrandBasicsData {
  geo: string[]
  launchDate: string
  linkedProduct: string
  comment: string
}

export interface BrandConceptData {
  selectedId: string | null
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

export interface BrandStepData {
  brandBasics: BrandBasicsData
  mode: 'light' | 'dark' | null
  concept: BrandConceptData
  externalNaming: BrandExternalNamingData
  internalNaming: BrandInternalNamingData
  previewComment: string
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
  ceoComments: Record<string, string> | null
  ceoSelections: Record<string, string> | null
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

export interface UpdateBrandStatusPayload {
  status: BrandStatus
  ceoComments?: Record<string, string>
  ceoSelections?: Record<string, string>
}
