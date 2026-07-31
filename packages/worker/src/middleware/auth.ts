import { createMiddleware } from 'hono/factory'
import { getCookie, deleteCookie } from 'hono/cookie'
import type { Env, Variables } from '../types'
import { LIBRARY_WRITE_PERMISSIONS, ADMIN_ROLES } from '@brand-constructor/shared'
import { verifyJWT } from '../utils/jwt'
import {
  AUTH_COOKIE_NAME,
  AUTH_ERROR_CODE,
  authCookieOptions,
  isSessionCapExceeded,
  mintSessionCookie,
  sessionAnchor,
  shouldRefreshSession,
} from '../utils/session'

// Re-exported for existing importers; the cookie name and the rest of the
// session policy now live in `utils/session.ts`.
export { AUTH_COOKIE_NAME }

// Cookie-based auth is the only path in every environment, including local
// `wrangler dev`. Local development logs in through the same Google OAuth
// flow used in production (/api/auth/google).
export const authMiddleware = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    const cookieToken = getCookie(c, AUTH_COOKIE_NAME)
    if (!cookieToken) {
      return c.json(
        {
          success: false,
          error: 'Unauthorized: missing token',
          code: AUTH_ERROR_CODE.UNAUTHENTICATED,
        },
        401
      )
    }

    const payload = await verifyJWT(cookieToken, c.env.JWT_SECRET)

    if (!payload) {
      return c.json(
        {
          success: false,
          error: 'Unauthorized: invalid or expired token',
          code: AUTH_ERROR_CODE.UNAUTHENTICATED,
        },
        401
      )
    }

    // Absolute cap: the token may still be within its idle window, but a
    // rolling session must not outrun the ceiling measured from first login.
    const now = Math.floor(Date.now() / 1000)
    const anchor = sessionAnchor(payload)
    if (isSessionCapExceeded(anchor, now)) {
      deleteCookie(c, AUTH_COOKIE_NAME, authCookieOptions(c))
      return c.json(
        {
          success: false,
          error: 'Unauthorized: session expired, please sign in again',
          code: AUTH_ERROR_CODE.SESSION_EXPIRED,
        },
        401
      )
    }

    // Fetch latest user data from DB to capture any role changes
    const user = await c.env.DB.prepare('SELECT id, email, name, role FROM users WHERE id = ?')
      .bind(payload.sub)
      .first<{ id: string; email: string; name: string; role: string }>()

    if (!user) {
      return c.json(
        {
          success: false,
          error: 'Unauthorized: user not found',
          code: AUTH_ERROR_CODE.UNAUTHENTICATED,
        },
        401
      )
    }

    c.set('user', user)
    c.set('authMethod', 'cookie')
    c.set('sessionAnchor', anchor)

    await next()

    // Sliding refresh, applied AFTER the handler so the Set-Cookie lands on
    // the final response (Hono's `c.header` targets `c.res` once it exists —
    // the same ordering the security-header middleware in index.ts relies on).
    // Keying the CSRF token off `sid` rather than `iat` is what makes this
    // rotation transparent to the SPA.
    if (shouldRefreshSession(payload.iat, now)) {
      await mintSessionCookie(c, user, { sid: anchor, now })
    }
  }
)

export function requireLibraryAccess(library: string) {
  return createMiddleware<{ Bindings: Env; Variables: Variables }>(async (c, next) => {
    const user = c.get('user')
    const allowedRoles = LIBRARY_WRITE_PERMISSIONS[library]

    if (!allowedRoles || !allowedRoles.includes(user.role)) {
      return c.json(
        { success: false, error: 'Forbidden: insufficient permissions for this library' },
        403
      )
    }

    return next()
  })
}

export const requireAdmin = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    const user = c.get('user')
    if (!(ADMIN_ROLES as readonly string[]).includes(user.role)) {
      return c.json({ success: false, error: 'Forbidden: admin access required' }, 403)
    }
    return next()
  }
)

// Strict admin-only guard for /users CRUD routes. User management (including
// the ability to mutate other admins) is restricted to role === 'admin'.
// `requireAdmin` above is intentionally broader (admin + head_dhc) and is
// used for shared admin surfaces such as brand approval and library writes.
export const requireAdminOnly = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    const user = c.get('user')
    if (user.role !== 'admin') {
      return c.json({ success: false, error: 'Forbidden: only admin can manage users' }, 403)
    }
    return next()
  }
)
