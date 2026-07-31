// Session lifetime policy and cookie minting, shared by `routes/auth.ts`
// (login) and `middleware/auth.ts` (sliding refresh). Lives in its own module
// so the middleware can re-issue a cookie without importing the route file
// (which imports the middleware — a cycle).
//
// Model: rolling (sliding) session on top of a stateless HS256 JWT.
//
//   - `iat`  — when THIS token was minted; the cookie expires
//              `SESSION_IDLE_SEC` after it. Every authenticated request past
//              the halfway mark mints a fresh token, so an active user is
//              never logged out mid-work, while an idle browser loses the
//              session after the idle window.
//   - `sid`  — when the SESSION started (first login). Never changes across
//              refreshes, which gives us two things: an absolute cap that a
//              rolling session cannot outrun, and a stable anchor for the
//              CSRF token so rotation does not invalidate the token the SPA
//              holds in memory.
//
// Tokens minted before `sid` existed simply fall back to `iat`
// (see `sessionAnchor`), so live sessions survive the deploy.

import { setCookie } from 'hono/cookie'
import type { Context } from 'hono'
import type { Env, Variables } from '../types'
import { createJWT, type JWTPayload } from './jwt'

type AppContext = Context<{ Bindings: Env; Variables: Variables }>

/** Cookie carrying the auth JWT. HttpOnly — never readable from JS. */
export const AUTH_COOKIE_NAME = 'auth_token'

/** Idle window: how long a session survives with no requests at all. */
export const SESSION_IDLE_SEC = 60 * 60

/**
 * Absolute cap measured from first login. A rolling session cannot exceed it,
 * so a forgotten open tab cannot stay authenticated indefinitely.
 */
export const SESSION_ABSOLUTE_SEC = 12 * 60 * 60

/**
 * Mint a fresh token once the current one is past its halfway point. Half the
 * idle window keeps the refresh rate low (at most one per 30 min per client)
 * while leaving a wide margin before expiry.
 */
export const SESSION_REFRESH_AFTER_SEC = SESSION_IDLE_SEC / 2

/** Error codes returned with 401 so the SPA can pick the right message. */
export const AUTH_ERROR_CODE = {
  /** No cookie, bad signature, or the idle window elapsed. */
  UNAUTHENTICATED: 'unauthenticated',
  /** Cookie still valid but the absolute session cap was reached. */
  SESSION_EXPIRED: 'session_expired',
} as const

/**
 * Shared cookie attributes for set and clear. `Secure` is disabled in
 * development so the cookie still flows over plain HTTP from `vite dev` →
 * `wrangler dev`; this is the ONLY behavioural difference driven by the
 * ENVIRONMENT flag — cookie auth is the single auth path everywhere.
 *
 * Logout must pass exactly these attributes to `deleteCookie`, otherwise some
 * browsers keep the original cookie alive.
 */
export function authCookieOptions(c: AppContext) {
  const isDev = c.env.ENVIRONMENT === 'development'
  return {
    path: '/',
    httpOnly: true,
    secure: !isDev,
    sameSite: 'Lax' as const,
  }
}

/**
 * Session start time — the value CSRF tokens and the absolute cap are keyed
 * off. Falls back to `iat` for tokens minted before `sid` was introduced.
 */
export function sessionAnchor(payload: Pick<JWTPayload, 'iat' | 'sid'>): number {
  return payload.sid ?? payload.iat
}

/** True once the session has outlived the absolute cap. */
export function isSessionCapExceeded(anchor: number, now: number): boolean {
  return now - anchor > SESSION_ABSOLUTE_SEC
}

/** True once the current token is past its halfway point and worth renewing. */
export function shouldRefreshSession(issuedAt: number, now: number): boolean {
  return now - issuedAt >= SESSION_REFRESH_AFTER_SEC
}

interface MintInput {
  id: string
  email: string
  name: string
  role: string
}

/**
 * Mint a JWT for `user` and attach it to the response as the auth cookie.
 *
 * `sid` anchors the session: pass the existing anchor when refreshing, omit it
 * at login to start a new session. The cookie `maxAge` is clamped to the
 * remaining absolute lifetime, so the browser drops the cookie exactly when
 * the cap is reached instead of sending a token the server would reject.
 */
export async function mintSessionCookie(
  c: AppContext,
  user: MintInput,
  options: { sid?: number; now?: number } = {}
): Promise<{ iat: number; sid: number }> {
  const now = options.now ?? Math.floor(Date.now() / 1000)
  const sid = options.sid ?? now

  const remainingAbsolute = Math.max(0, sid + SESSION_ABSOLUTE_SEC - now)
  const maxAge = Math.min(SESSION_IDLE_SEC, remainingAbsolute)

  const token = await createJWT(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      iat: now,
      exp: now + maxAge,
      sid,
    },
    c.env.JWT_SECRET
  )

  setCookie(c, AUTH_COOKIE_NAME, token, { ...authCookieOptions(c), maxAge })

  return { iat: now, sid }
}
