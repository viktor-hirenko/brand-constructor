import type { BrandStepData, ExternalNaming } from '@brand-constructor/shared/types'
import { isExternalNamingStepValid } from '@/utils/externalNamingValidation'

export interface WizardStepValidationContext {
  externalNamings: Pick<ExternalNaming, 'id' | 'availability_status'>[]
  hasComponentConflicts: boolean
}

/** Pure wizard step gate used by `useBrandData.validateStep`. */
export function validateWizardStep(
  step: number,
  stepData: BrandStepData,
  ctx: WizardStepValidationContext
): boolean {
  switch (step) {
    case 1:
      return stepData.brandBasics.geo.length > 0 && stepData.brandBasics.launchDate !== ''
    case 2:
      return (
        stepData.mode !== null &&
        (stepData.concept.selectedId !== null || stepData.concept.newConceptBrief !== null)
      )
    case 3: {
      const en = stepData.externalNaming
      return isExternalNamingStepValid(
        en.selectedIds,
        en.comment,
        en.newNamingBrief !== null,
        ctx.externalNamings
      )
    }
    case 4: {
      const inn = stepData.internalNaming
      return (
        inn.selectedId !== null ||
        (inn.newNamingFeedback !== null && inn.newNamingFeedback.trim() !== '')
      )
    }
    case 5:
      return stepData.marketingPackage.selectedId !== null
    case 6: {
      const del = stepData.deliverables
      const hasAnythingEnabled = del.legalLanding || del.partnerLanding
      if (hasAnythingEnabled && del.developmentDeadline === '') return false
      return true
    }
    case 7: {
      const vc = stepData.visualComponents
      if (vc.delegateToDesigners) return true
      const selectionCount = Object.keys(vc.selections).length
      if (selectionCount === 0) return false
      if (ctx.hasComponentConflicts) return false
      return true
    }
    default:
      return true
  }
}
