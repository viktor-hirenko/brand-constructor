import type { BrandStepData, ExternalNaming } from '@brand-constructor/shared/types'
import { isExternalNamingStepValid } from '@/utils/externalNamingValidation'

/** Wizard step 7 requires one variant per type (Theme excluded from UI). */
export const REQUIRED_WIZARD_VISUAL_COMPONENT_TYPE_IDS = [
  'ct_header',
  'ct_banners',
  'ct_thumbnails',
  'ct_tabbar',
  'ct_sidebar',
] as const

export function hasAllRequiredVisualComponentSelections(
  selections: Record<string, string>
): boolean {
  return REQUIRED_WIZARD_VISUAL_COMPONENT_TYPE_IDS.every(typeId =>
    Boolean(selections[typeId]?.trim())
  )
}

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
      if (ctx.hasComponentConflicts) return false
      return hasAllRequiredVisualComponentSelections(vc.selections)
    }
    default:
      return true
  }
}
