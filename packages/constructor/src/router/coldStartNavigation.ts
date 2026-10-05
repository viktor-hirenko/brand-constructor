import type { LocationQueryValue } from 'vue-router'

export interface ColdStartNavigationInput {
  fromName: string | symbol | undefined
  toQueryEditBrand?: LocationQueryValue | LocationQueryValue[]
  /** `to.meta.draftEdit === true` — active on `/draft-edit/*` cascade sub-routes. */
  toIsDraftEdit?: boolean
  /** `to.meta.poEdit === true` — active on the revision `/po-edit/*` sub-routes. */
  toIsPoEdit?: boolean
  /** `to.params.id` — brand id for path-based brand sub-routes. */
  toParamsId?: string
}

export type ColdStartNavigationResult =
  | true
  | { name: 'brand-view-review'; params: { id: string } }

/**
 * Cold-start (F5 / direct-URL) navigation handler.
 *
 * `/ceo-reselect/*` cold starts stay on the sub-route: the Supervisor's
 * in-progress picks are restored from storage after `loadBrand()`.
 *
 * The remaining `editBrand` query-fallback is for wizard URLs
 * (`/constructor/step/N?editBrand=<id>`) which the brief review screen uses
 * for inline-editing basics / marketing / deliverables / visual sections.
 * Those URLs don't carry the brief id in the path, so on cold start we
 * redirect to the brand review page where `loadBrand()` runs.
 *
 * The `/draft-edit/*` and `/po-edit/*` edit screens are not persisted: an edit
 * the Author did not save is dropped, so on a cold start we send them back to
 * the brand review, which shows what the server has. `/po-edit/*` used to stay
 * and get its picks back from the browser, and the review then showed them as
 * if saved while the server had the old ones (H-03, run 02.10: D-07, D-13).
 */
export function resolveColdStartNavigation(
  input: ColdStartNavigationInput
): ColdStartNavigationResult {
  const isColdStart = input.fromName === undefined
  if (!isColdStart) return true

  const toIsEditScreen = input.toIsDraftEdit || input.toIsPoEdit
  if (toIsEditScreen && typeof input.toParamsId === 'string' && input.toParamsId) {
    return { name: 'brand-view-review', params: { id: input.toParamsId } }
  }

  const editBrand = input.toQueryEditBrand
  if (typeof editBrand === 'string' && editBrand) {
    return { name: 'brand-view-review', params: { id: editBrand } }
  }

  return true
}
