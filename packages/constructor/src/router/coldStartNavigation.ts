import type { LocationQueryValue } from 'vue-router'

export interface ColdStartNavigationInput {
  fromName: string | symbol | undefined
  toMeta: { poEdit?: boolean; ceoReselect?: boolean }
  toParamsId: string | undefined
  toQueryEditBrand?: LocationQueryValue | LocationQueryValue[]
}

export type ColdStartNavigationResult =
  | true
  | { name: 'brand-view-review'; params: { id: string } }

/**
 * Redirect F5 / direct-URL access on transient edit flows back to brand review.
 * `fromName === undefined` is Vue Router 4 cold-start signal.
 */
export function resolveColdStartNavigation(
  input: ColdStartNavigationInput
): ColdStartNavigationResult {
  const isColdStart = input.fromName === undefined
  if (!isColdStart) return true

  const isEditSubRoute = input.toMeta.ceoReselect === true || input.toMeta.poEdit === true
  if (isEditSubRoute && input.toParamsId) {
    return { name: 'brand-view-review', params: { id: input.toParamsId } }
  }

  const editBrand = input.toQueryEditBrand
  if (typeof editBrand === 'string' && editBrand) {
    return { name: 'brand-view-review', params: { id: editBrand } }
  }

  return true
}
