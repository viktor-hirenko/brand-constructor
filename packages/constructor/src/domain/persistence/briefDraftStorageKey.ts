/**
 * Generates a deterministic localStorage key that is isolated by brief ID and
 * the interactive role of the current user.
 *
 * Three distinct role-scopes exist:
 *  - `supervisor-reselect` — Supervisor (CEO/CPO) alternative selections in
 *    the `/ceo-reselect/*` sub-routes.
 *  - `supervisor-comments` — Supervisor's in-progress comment edits made on
 *    the review screen and inside `/ceo-reselect/*` flows. Lives on its own
 *    key because comments aren't pushed to the server until the Supervisor
 *    triggers a status-change (approve / needs_revision); without F5
 *    persistence they would silently disappear on refresh.
 *  - `author-revision` — Author (PO) pending picks inside the `/po-edit/*`
 *    sub-routes after a brief was returned for revision.
 *
 * The key is intentionally human-readable so engineers can inspect it in
 * browser DevTools without decoding.
 */

export type BriefDraftScope =
  | 'supervisor-reselect'
  | 'supervisor-comments'
  | 'author-revision'

export function briefDraftStorageKey(briefId: string, scope: BriefDraftScope): string {
  return `brief_${briefId}_${scope}`
}
