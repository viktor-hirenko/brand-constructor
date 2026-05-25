import type { LocationQueryValue } from 'vue-router'

export interface ColdStartNavigationInput {
  fromName: string | symbol | undefined
  toQueryEditBrand?: LocationQueryValue | LocationQueryValue[]
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
 */
export function resolveColdStartNavigation(
  input: ColdStartNavigationInput
): ColdStartNavigationResult {
  const isColdStart = input.fromName === undefined
  if (!isColdStart) return true

  const editBrand = input.toQueryEditBrand
  if (typeof editBrand === 'string' && editBrand) {
    return { name: 'brand-view-review', params: { id: editBrand } }
  }

  return true
}
