import { BRAND_BRIEF_STATUS } from '@brand-constructor/shared'
import { wizardStepLocation } from '@/utils/brandHydration'

/**
 * A draft opened by a link without its step (`/workspace/brand/<id>`, Slack,
 * a copied address) lands on the brief review. A draft that has not reached
 * the review yet goes to the step it stopped at — otherwise the review showed
 * «Бриф готовий» and an active «На погодження CEO» for an empty draft (full
 * run 06.10, bug 1). Only the review page itself, and only when the wizard
 * opens on it (`fromName` undefined — a link, F5): returning to the review
 * after «Зберегти» of a section edit stays on the review.
 */
export function draftLinkStepRedirect(
  toName: string | symbol | null | undefined,
  fromName: string | symbol | null | undefined,
  brand: { id: string; status: string; currentStep?: number | null }
): ReturnType<typeof wizardStepLocation> | null {
  if (toName !== 'brand-view-review') return null
  if (fromName !== undefined && fromName !== null) return null
  if (brand.status !== BRAND_BRIEF_STATUS.DRAFT) return null
  const step = brand.currentStep ?? 8
  if (step >= 8) return null
  return wizardStepLocation(step, brand.id)
}
