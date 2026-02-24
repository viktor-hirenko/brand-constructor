import { createMiddleware } from 'hono/factory'
import type { Env, Variables } from '../types'
import { LIBRARY_WRITE_PERMISSIONS, ADMIN_ROLES } from '@brand-constructor/shared'
import { verifyJWT } from '../utils/jwt'

export const authMiddleware = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    const env = c.env.ENVIRONMENT

    if (env === 'development') {
      const devEmail = c.req.header('X-Dev-User-Email')

      let user
      if (devEmail) {
        user = await c.env.DB.prepare('SELECT id, email, name, role FROM users WHERE email = ?')
          .bind(devEmail)
          .first()
      } else {
        user = await c.env.DB.prepare(
          "SELECT id, email, name, role FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1"
        ).first()
      }

      if (!user) {
        return c.json(
          { success: false, error: 'No admin user found. Run seed or create one.' },
          401
        )
      }

      c.set('user', user as { id: string; email: string; name: string; role: string })
      return next()
    }

    // Production: verify our own JWT signed with JWT_SECRET
    const authHeader = c.req.header('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ success: false, error: 'Unauthorized: missing token' }, 401)
    }

    const token = authHeader.substring(7)
    const payload = await verifyJWT(token, c.env.JWT_SECRET)

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
