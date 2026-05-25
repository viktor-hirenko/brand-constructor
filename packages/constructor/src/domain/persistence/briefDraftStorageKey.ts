/**
 * Generates a deterministic localStorage key that is isolated by brief ID and
 * the interactive role of the current user.
 *
 * Two distinct role-scopes exist:
 *  - `supervisor-reselect`  — Supervisor (CEO/CPO) alternative selections in
 *    the `/ceo-reselect/*` sub-routes.
 *  - `author-revision` — Author (PO) pending picks inside the `/po-edit/*`
 *    sub-routes after a brief was returned for revision.
 *
 * The key is intentionally human-readable so engineers can inspect it in
 * browser DevTools without decoding.
 */

export type BriefDraftScope = 'supervisor-reselect' | 'author-revision'

export function briefDraftStorageKey(briefId: string, scope: BriefDraftScope): string {
  return `brief_${briefId}_${scope}`
}
