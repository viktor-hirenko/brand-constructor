import { BRAND_BRIEF_REVIEW_PHASE, type BrandBriefReviewPhase } from './BrandBriefReviewPhase'

export interface ResolveBriefReviewPhaseParams {
  /** Raw status string from the server (BrandStatus). */
  status: string
  /** True when the current user has the `cpo_ceo` role. */
  isSupervisor: boolean
  /** `route.meta.ceoReselect === true` — active on `/ceo-reselect/*` sub-routes. */
  routeIsCeoReselect: boolean
  /** `route.meta.poEdit === true` — active on `/po-edit/*` sub-routes. */
  routeIsPoEdit: boolean
  /** `route.meta.draftEdit === true` — active on `/draft-edit/*` cascade sub-routes. */
  routeIsDraftEdit: boolean
  /** `route.meta.step` — numeric wizard step, or `undefined` on non-step routes. */
  routeStep: number | undefined
}

/**
 * Pure function — maps the combination of brief status, user role, and active
 * route meta flags to a single `BrandBriefReviewPhase` value.
 *
 * Evaluation order is deliberate: route meta flags take precedence over status,
 * so sub-route phases (AlternativeSelection, RevisionResponse) are detected
 * before the step-8 review phases.
 */
export function resolveBrandBriefReviewPhase({
  status,
  isSupervisor,
  routeIsCeoReselect,
  routeIsPoEdit,
  routeIsDraftEdit,
  routeStep,
}: ResolveBriefReviewPhaseParams): BrandBriefReviewPhase {
  if (routeIsCeoReselect) return BRAND_BRIEF_REVIEW_PHASE.ALTERNATIVE_SELECTION
  // `draft-edit` is a distinct flow (draft concept→external cascade) but shares
  // the exact edit-flow layout + right-panel preview machinery of the
  // revision-response screens, so it deliberately reuses REVISION_RESPONSE
  // rather than introducing a new phase (which would force changes across
  // every phase `switch`). Route name disambiguates where behaviour differs.
  if (routeIsPoEdit || routeIsDraftEdit) return BRAND_BRIEF_REVIEW_PHASE.REVISION_RESPONSE

  // Everything below is the step-8 review surface.
  if (routeStep !== 8) return BRAND_BRIEF_REVIEW_PHASE.WIZARD

  if (status === 'approved') return BRAND_BRIEF_REVIEW_PHASE.APPROVED

  if (isSupervisor && (status === 'submitted' || status === 'needs_revision')) {
    return BRAND_BRIEF_REVIEW_PHASE.SUPERVISOR_REVIEW
  }

  if (status === 'needs_revision') return BRAND_BRIEF_REVIEW_PHASE.AUTHOR_RETURNED
  if (status === 'submitted') return BRAND_BRIEF_REVIEW_PHASE.AUTHOR_SUBMITTED

  return BRAND_BRIEF_REVIEW_PHASE.AUTHOR_DRAFT
}
