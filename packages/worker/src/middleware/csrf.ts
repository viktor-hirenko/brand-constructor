import { createMiddleware } from 'hono/factory'
import type { Env, Variables } from '../types'
import { createCsrfToken, timingSafeEqual } from '../utils/csrf'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

// CSRF middleware. Runs AFTER authMiddleware so `user`, `authMethod` and
// `jwtIat` are already populated on the context. Safe methods
// (GET/HEAD/OPTIONS) are skipped — they have no body and no side effects.
// Every other request must carry a valid X-CSRF-Token header derived from
// the auth cookie (see utils/csrf.ts for the derivation rationale).
export const csrfMiddleware = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    const method = c.req.method.toUpperCase()
    if (SAFE_METHODS.has(method)) return next()

    const authMethod = c.get('authMethod')
    if (authMethod !== 'cookie') {
      return c.json({ success: false, error: 'CSRF: no auth context' }, 403)
    }

    const user = c.get('user')
    const jwtIat = c.get('jwtIat')
    if (!user || jwtIat === undefined) {
      return c.json({ success: false, error: 'CSRF: missing user context' }, 403)
    }

    const provided = c.req.header('X-CSRF-Token')
    if (!provided) {
      return c.json({ success: false, error: 'CSRF: missing X-CSRF-Token header' }, 403)
    }

    const expected = await createCsrfToken({ sub: user.id, iat: jwtIat }, c.env.JWT_SECRET)
    if (!timingSafeEqual(provided, expected)) {
      return c.json({ success: false, error: 'CSRF: token mismatch' }, 403)
    }

    return next()
  }
)
