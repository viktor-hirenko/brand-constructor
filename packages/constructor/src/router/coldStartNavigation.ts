import type { LocationQueryValue } from 'vue-router'

export interface ColdStartNavigationInput {
  fromName: string | symbol | undefined
  toQueryEditBrand?: LocationQueryValue | LocationQueryValue[]
  /** `to.meta.draftEdit === true` — active on `/draft-edit/*` cascade sub-routes. */
  toIsDraftEdit?: boolean
  /** `to.params.id` — brand id for path-based brand sub-routes. */
  toParamsId?: string
}

export type ColdStartNavigationResult =
  | true
  | { name: 'brand-view-review'; params: { id: string } }

/**
 * Cold-start (F5 / direct-URL) navigation handler.
 *
 * Previously this also redirected `/ceo-reselect/*` and `/po-edit/*` cold
 * starts to the brand review page — a workaround for the lost in-progress
 * selections. Now that the persistence layer
 * (`domain/persistence/briefDraftStorage.ts`) restores both supervisor and
 * author drafts after `loadBrand()`, that redirect is gone and users stay
 * on the sub-route they came back to.
 *
 * The remaining `editBrand` query-fallback is for wizard URLs
 * (`/constructor/step/N?editBrand=<id>`) which the brief review screen uses
 * for inline-editing basics / marketing / deliverables / visual sections.
 * Those URLs don't carry the brief id in the path, so on cold start we
 * redirect to the brand review page where `loadBrand()` runs.
 *
 * The `/draft-edit/*` cascade routes are a special case: unlike `/po-edit/*`
 * and `/ceo-reselect/*`, the draft inline-edit session is NOT persisted to
 * storage (no `authorRevisionDraft` / `supervisorAlternativeDraft` envelope).
 * On a cold start the in-progress concept/external state is gone, so we send
 * the user back to the brand review rather than render an inconsistent step.
 */
export function resolveColdStartNavigation(
  input: ColdStartNavigationInput
): ColdStartNavigationResult {
  const isColdStart = input.fromName === undefined
  if (!isColdStart) return true

  if (input.toIsDraftEdit && typeof input.toParamsId === 'string' && input.toParamsId) {
    return { name: 'brand-view-review', params: { id: input.toParamsId } }
  }

  const editBrand = input.toQueryEditBrand
  if (typeof editBrand === 'string' && editBrand) {
    return { name: 'brand-view-review', params: { id: editBrand } }
  }

  return true
}
