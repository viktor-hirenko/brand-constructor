import { apiErrorStatus } from '@/composables/useApi'

export const BRIEF_NO_ACCESS_ROUTE_NAME = 'brief-no-access'

export type BriefLoadFailureRedirect = { name: typeof BRIEF_NO_ACCESS_ROUTE_NAME } | { path: '/' }

/**
 * Where a direct link to a brief goes when `GET /api/brands/:id` fails.
 *
 * The server answers «not found» for every brief the person may not read: a
 * Product Owner opening another author's brief, a team role (Strategy, UI…)
 * opening one that is not approved yet, the CEO opening a draft. All of them
 * used to land on the wizard landing — PO2 on «Бриф на створення бренду» with
 * «Order New Brand» as if the link were a new brief (H-41, T-083), Strategy on
 * an empty landing with one «Закрити» (H-52, U-13). They now get a stub that
 * says the brief is not theirs to open.
 *
 * Anything else (no connection, a server error) is not a statement about
 * access, so it keeps going to the landing as before.
 */
export function briefLoadFailureRedirect(err: unknown): BriefLoadFailureRedirect {
  const status = apiErrorStatus(err)
  if (status === 403 || status === 404) return { name: BRIEF_NO_ACCESS_ROUTE_NAME }
  return { path: '/' }
}
