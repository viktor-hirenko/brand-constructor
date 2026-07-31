// Single entry point for "the session is gone" across the Admin SPA.
//
// Any API call can be the one that discovers a dead cookie, and a screen
// typically fires several in parallel (plus background list polling) — so this
// module is single-flight: the first caller wins and the rest are swallowed.
// Without that, concurrent 401s would each trigger a redirect and the page
// would thrash.
//
// The hand-off is a full document navigation rather than a `router.push`. A
// dead session must not leave any in-memory store, cached list or mounted
// Wizard iframe behind, and a hard navigation is the only way to guarantee
// that. It also rebuilds the app from a clean boot, which is what the user
// gets anyway after signing back in.

const LOGIN_PATH = '/login'

let handling = false

/** True once a session-expiry hand-off is in flight; callers should bail out. */
export function isSessionExpiryInFlight(): boolean {
  return handling
}

/** Why the user is being sent back to the login screen. */
export type SessionEndReason = 'expired' | 'signed_out'

interface SessionExpiryOptions {
  /** Path to return to after signing back in. Defaults to the current URL. */
  redirect?: string
  reason?: SessionEndReason
}

/**
 * Send the user to the login screen exactly once, remembering where they were.
 *
 * The reason is passed through so the login view can explain what happened
 * instead of silently presenting a sign-in button, which otherwise reads as a
 * bug.
 */
export function handleSessionExpired(options: SessionExpiryOptions = {}): void {
  if (handling) return
  handling = true

  const target = options.redirect ?? `${window.location.pathname}${window.location.search}`
  const isAlreadyOnLogin = window.location.pathname.startsWith(LOGIN_PATH)
  const params = new URLSearchParams({ reason: options.reason ?? 'expired' })
  if (!isAlreadyOnLogin) params.set('redirect', target)

  window.location.assign(`${LOGIN_PATH}?${params.toString()}`)
}
