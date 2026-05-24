import { describe, expect, it } from 'vitest'
import type { BrandStepData, NewConceptBrief } from '@brand-constructor/shared/types'
import { validateWizardStep } from '@/utils/wizardStepValidation'

const sampleConceptBrief: NewConceptBrief = {
  isNewGeo: null,
  geoInfo: '',
  needsGeoResearch: null,
  conceptFeedback: 'Need a new concept',
  trafficTeamInfo: '',
  competitors: '',
  keepProductConnection: null,
  connectedProducts: '',
  namingLanguage: '',
  desiredWordsInName: '',
  domainZones: [],
  domainBudget: null,
  namingDeadline: '',
  additionalGeoInfo: '',
}

function createStepData(overrides: Partial<BrandStepData> = {}): BrandStepData {
  return {
    stepLayoutVersion: 2,
    brandBasics: { geo: ['UA'], launchDate: '2026-06-01', linkedProduct: '', comment: '' },
    mode: 'light',
    concept: { selectedId: 'concept-1', previewId: null, comment: '', newConceptBrief: null },
    externalNaming: { selectedIds: ['name-1'], comment: '', newNamingBrief: null },
    internalNaming: { selectedId: 'internal-1', comment: '', newNamingFeedback: null },
    marketingPackage: { selectedId: 'pkg-1', comment: '' },
    deliverables: {
      legalLanding: false,
      partnerLanding: false,
      developmentDeadline: '',
      comment: '',
    },
    visualComponents: { selections: { hero: 'v1' }, delegateToDesigners: false, comment: '' },
    ...overrides,
  }
}

const ctx = {
  externalNamings: [
    { id: 'name-1', availability_status: 'available' as const },
    { id: 'sold-1', availability_status: 'sold' as const },
  ],
  hasComponentConflicts: false,
}

describe('validateWizardStep', () => {
  it('validates step 1 basics', () => {
    expect(validateWizardStep(1, createStepData(), ctx)).toBe(true)
    expect(
      validateWizardStep(
        1,
        createStepData({ brandBasics: { geo: [], launchDate: '', linkedProduct: '', comment: '' } }),
        ctx
      )
    ).toBe(false)
  })

  it('validates step 2 concept or brief', () => {
    expect(validateWizardStep(2, createStepData(), ctx)).toBe(true)
    expect(
      validateWizardStep(
        2,
        createStepData({
          concept: { selectedId: null, previewId: null, comment: '', newConceptBrief: null },
        }),
        ctx
      )
    ).toBe(false)
    expect(
      validateWizardStep(
        2,
        createStepData({
          concept: {
            selectedId: null,
            previewId: null,
            comment: '',
            newConceptBrief: sampleConceptBrief,
          },
        }),
        ctx
      )
    ).toBe(true)
  })

  it('validates step 3 external naming comment rules', () => {
    expect(
      validateWizardStep(
        3,
        createStepData({
          externalNaming: { selectedIds: ['sold-1'], comment: '', newNamingBrief: null },
        }),
        ctx
      )
    ).toBe(false)
    expect(
      validateWizardStep(
        3,
        createStepData({
          externalNaming: {
            selectedIds: ['sold-1'],
            comment: 'Sold name rationale',
            newNamingBrief: null,
          },
        }),
        ctx
      )
    ).toBe(true)
  })

  it('validates step 6 deliverables deadline', () => {
    expect(
      validateWizardStep(
        6,
        createStepData({
          deliverables: {
            legalLanding: true,
            partnerLanding: false,
            developmentDeadline: '',
            comment: '',
          },
        }),
        ctx
      )
    ).toBe(false)
    expect(
      validateWizardStep(
        6,
        createStepData({
          deliverables: {
            legalLanding: true,
            partnerLanding: false,
            developmentDeadline: '2026-07-01',
            comment: '',
          },
        }),
        ctx
      )
    ).toBe(true)
  })

  it('validates step 7 visual components and conflicts', () => {
    expect(
      validateWizardStep(
        7,
        createStepData({ visualComponents: { selections: {}, delegateToDesigners: false, comment: '' } }),
        ctx
      )
    ).toBe(false)
    expect(
      validateWizardStep(
        7,
        createStepData({ visualComponents: { selections: {}, delegateToDesigners: true, comment: '' } }),
        ctx
      )
    ).toBe(true)
    expect(validateWizardStep(7, createStepData(), { ...ctx, hasComponentConflicts: true })).toBe(
      false
    )
  })
})
