/**
 * Client-side view-model describing which interactive phase the current user
 * is in while working on a Brand Brief.
 *
 * This is NOT a server status — it is derived from the combination of
 * `BrandStatus`, the active user role, and the current route meta flags.
 * Never persist or send this value to the API.
 */
export const BRAND_BRIEF_REVIEW_PHASE = {
  /** PO is filling in wizard steps 1–7 for a new or draft brief. */
  WIZARD: 'wizard',

  /** PO has reached step 8 and the brief is still in `draft` status. */
  AUTHOR_DRAFT: 'author-draft',

  /**
   * PO has submitted the brief and is waiting for Supervisor review.
   * The brief is in `submitted` status; PO sees a read-only unified layout.
   */
  AUTHOR_SUBMITTED: 'author-submitted',

  /**
   * Supervisor (CEO/CPO) is reviewing a `submitted` or `needs_revision` brief
   * on the step-8 review layout. Inline comments and section-level reselect
   * actions are enabled.
   */
  SUPERVISOR_REVIEW: 'supervisor-review',

  /**
   * Supervisor has navigated into the dedicated `/ceo-reselect/*` sub-routes
   * to pick alternative concepts or namings.
   */
  ALTERNATIVE_SELECTION: 'alternative-selection',

  /**
   * PO has received the brief back (`needs_revision`) and is viewing
   * the returned unified layout with CEO comments and "Apply variant" actions.
   */
  AUTHOR_RETURNED: 'author-returned',

  /**
   * PO has navigated into the dedicated `/po-edit/*` sub-routes to choose a
   * new concept or naming in response to the Supervisor's revision request.
   */
  REVISION_RESPONSE: 'revision-response',

  /** The brief has been fully approved. Any role sees a read-only terminal view. */
  APPROVED: 'approved',
} as const

export type BrandBriefReviewPhase =
  (typeof BRAND_BRIEF_REVIEW_PHASE)[keyof typeof BRAND_BRIEF_REVIEW_PHASE]
