import { createMiddleware } from 'hono/factory';
import type { Env, Variables } from '../types';
import { LIBRARY_WRITE_PERMISSIONS, ADMIN_ROLES } from '@brand-constructor/shared';

/**
 * Auth middleware that extracts user identity from Cloudflare Access JWT
 * or falls back to a dev-mode header for local development.
 */
export const authMiddleware = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    const env = c.env.ENVIRONMENT;

    if (env === 'development') {
      const devEmail = c.req.header('X-Dev-User-Email');

      let user;
      if (devEmail) {
        user = await c.env.DB.prepare('SELECT id, email, name, role FROM users WHERE email = ?')
          .bind(devEmail)
          .first();
      } else {
        user = await c.env.DB.prepare("SELECT id, email, name, role FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1")
          .first();
      }

      if (!user) {
        return c.json({ success: false, error: 'No admin user found. Run seed or create one.' }, 401);
      }

      c.set('user', user as { id: string; email: string; name: string; role: string });
      return next();
    }

    const jwtPayload = c.req.header('Cf-Access-Jwt-Assertion');
    if (!jwtPayload) {
      return c.json({ success: false, error: 'Unauthorized: no access token' }, 401);
    }

    const email = c.req.header('Cf-Access-Authenticated-User-Email');
    if (!email) {
      return c.json({ success: false, error: 'Unauthorized: no email in token' }, 401);
    }

    let user = await c.env.DB.prepare('SELECT id, email, name, role FROM users WHERE email = ?')
      .bind(email)
      .first();

    if (!user) {
      const id = `usr_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
      await c.env.DB.prepare(
        'INSERT INTO users (id, email, name, role) VALUES (?, ?, ?, ?)'
      ).bind(id, email, email.split('@')[0], 'product_designer').run();

      user = { id, email, name: email.split('@')[0], role: 'product_designer' };
    }

    c.set('user', user as { id: string; email: string; name: string; role: string });
    return next();
  }
);

/**
 * Require specific library write permission
 */
export function requireLibraryAccess(library: string) {
  return createMiddleware<{ Bindings: Env; Variables: Variables }>(async (c, next) => {
    const user = c.get('user');
    const allowedRoles = LIBRARY_WRITE_PERMISSIONS[library];

    if (!allowedRoles || !allowedRoles.includes(user.role)) {
      return c.json(
        { success: false, error: 'Forbidden: insufficient permissions for this library' },
        403
      );
    }

    return next();
  });
}

/**
 * Require admin role
 */
export const requireAdmin = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    const user = c.get('user');
    if (!(ADMIN_ROLES as readonly string[]).includes(user.role)) {
      return c.json({ success: false, error: 'Forbidden: admin access required' }, 403);
    }
    return next();
  }
);
