import { describe, it, expect } from 'vitest'
import { buildStepDataFromBrand, normalizeWizardStepData } from '@/utils/brandHydration'
import { validateWizardStep } from '@/utils/wizardStepValidation'
import type { Brand, BrandStepData } from '@brand-constructor/shared/types'

const emptyStepData = (): BrandStepData => ({
  stepLayoutVersion: 2,
  brandBasics: { geo: [], launchDate: '', linkedProduct: '', comment: '' },
  mode: null,
  concept: { selectedId: null, comment: '', newConceptBrief: null },
  externalNaming: { selectedIds: [], comment: '', newNamingBrief: null },
  internalNaming: { selectedId: null, comment: '', newNamingFeedback: null },
  marketingPackage: { selectedId: null, comment: '' },
  deliverables: {
    legalLanding: false,
    partnerLanding: false,
    developmentDeadline: '',
    comment: '',
  },
  visualComponents: { selections: {}, delegateToDesigners: false, comment: '' },
})

describe('normalizeWizardStepData', () => {
  it('defaults null mode to light', () => {
    const result = normalizeWizardStepData(emptyStepData())
    expect(result.mode).toBe('light')
  })

  it('keeps explicit dark mode', () => {
    const result = normalizeWizardStepData({ ...emptyStepData(), mode: 'dark' })
    expect(result.mode).toBe('dark')
  })
})

describe('buildStepDataFromBrand', () => {
  it('hydrated draft with null mode passes step 2 when concept is set', () => {
    const brand = {
      id: 'brand_test',
      mode: null,
      conceptId: 'concept_1',
      stepData: null,
    } as unknown as Brand

    const stepData = buildStepDataFromBrand(brand)

    const valid = validateWizardStep(2, stepData, {
      externalNamings: [],
      hasComponentConflicts: false,
    })

    expect(stepData.mode).toBe('light')
    expect(valid).toBe(true)
  })
})
