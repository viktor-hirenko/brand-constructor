import { createMiddleware } from 'hono/factory'
import type { Env, Variables } from '../types'
import { createCsrfToken, timingSafeEqual } from '../utils/csrf'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

// F-05: CSRF middleware. Runs AFTER authMiddleware (so `user`, `authMethod`,
// `jwtIat` are already populated on the context). Skip rules, in order:
//   1) Safe methods (GET/HEAD/OPTIONS) — no body, no side effects.
//   2) Dev mode (authMethod === 'dev') — no real JWT, no cookies, header
//      auth via X-Dev-User-Email; CSRF is meaningless here.
//   3) Legacy Bearer-token clients (authMethod === 'bearer') — pre-F-05 SPA
//      bundles still in users' open tabs. They don't know about CSRF tokens.
//      Their auth is also XSS-vulnerable (token in localStorage) so adding
//      CSRF on top would be security-theater. To be removed in a follow-up
//      once Bearer support is dropped server-side.
//
// Cookie-authed clients (authMethod === 'cookie') always enforce.
export const csrfMiddleware = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    const method = c.req.method.toUpperCase()
    if (SAFE_METHODS.has(method)) return next()

    const authMethod = c.get('authMethod')
    if (authMethod === 'dev' || authMethod === 'bearer') return next()

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
