import { createMiddleware } from 'hono/factory'
import { getCookie } from 'hono/cookie'
import type { Env, Variables } from '../types'
import { LIBRARY_WRITE_PERMISSIONS, ADMIN_ROLES } from '@brand-constructor/shared'
import { verifyJWT } from '../utils/jwt'

// Cookie name shared between authRoutes (setCookie) and authMiddleware
// (getCookie). HttpOnly + Secure + SameSite=Lax — see routes/auth.ts.
export const AUTH_COOKIE_NAME = 'auth_token'

// Cookie-based auth is the only path in every environment, including local
// `wrangler dev`. Local development logs in through the same Google OAuth
// flow used in production (/api/auth/google).
export const authMiddleware = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    const cookieToken = getCookie(c, AUTH_COOKIE_NAME)
    if (!cookieToken) {
      return c.json({ success: false, error: 'Unauthorized: missing token' }, 401)
    }

    const payload = await verifyJWT(cookieToken, c.env.JWT_SECRET)

    if (!payload) {
      return c.json({ success: false, error: 'Unauthorized: invalid or expired token' }, 401)
    }

    // Fetch latest user data from DB to capture any role changes
    const user = await c.env.DB.prepare('SELECT id, email, name, role FROM users WHERE id = ?')
      .bind(payload.sub)
      .first<{ id: string; email: string; name: string; role: string }>()

    if (!user) {
      return c.json({ success: false, error: 'Unauthorized: user not found' }, 401)
    }

    c.set('user', user)
    c.set('authMethod', 'cookie')
    c.set('jwtIat', payload.iat)
    return next()
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
