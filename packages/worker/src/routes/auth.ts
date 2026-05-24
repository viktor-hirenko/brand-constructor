import { Hono } from 'hono'
import { setCookie, deleteCookie } from 'hono/cookie'
import type { Context } from 'hono'
import type { Env, Variables } from '../types'
import { createJWT } from '../utils/jwt'
import { createCsrfToken } from '../utils/csrf'
import { authMiddleware, AUTH_COOKIE_NAME } from '../middleware/auth'

const authRoutes = new Hono<{ Bindings: Env; Variables: Variables }>()

const TOKEN_LIFETIME_SEC = 24 * 60 * 60

interface GoogleTokenInfo {
  email: string
  email_verified: string
  name: string
  picture?: string
  exp: string
  aud: string
  sub: string
}

// Shared cookie attributes for login (set) and logout (clear). `Secure` is
// disabled in development so the cookie still flows over plain HTTP from
// `vite dev` → `wrangler dev`; this is the ONLY behavioural difference
// driven by the ENVIRONMENT flag — cookie auth is the single auth path
// everywhere.
function authCookieOptions(c: Context<{ Bindings: Env; Variables: Variables }>) {
  const isDev = c.env.ENVIRONMENT === 'development'
  return {
    path: '/',
    httpOnly: true,
    secure: !isDev,
    sameSite: 'Lax' as const,
  }
}

interface AuthUserRow {
  id: string
  email: string
  name: string
  role: string
}

async function issueAuthSession(
  c: Context<{ Bindings: Env; Variables: Variables }>,
  user: AuthUserRow,
  displayName?: string
) {
  const name = displayName ?? user.name
  const now = Math.floor(Date.now() / 1000)
  const token = await createJWT(
    {
      sub: user.id,
      email: user.email,
      name,
      role: user.role,
      iat: now,
      exp: now + TOKEN_LIFETIME_SEC,
    },
    c.env.JWT_SECRET
  )

  setCookie(c, AUTH_COOKIE_NAME, token, {
    ...authCookieOptions(c),
    maxAge: TOKEN_LIFETIME_SEC,
  })

  const csrfToken = await createCsrfToken({ sub: user.id, iat: now }, c.env.JWT_SECRET)

  return c.json({
    success: true,
    data: {
      user: { id: user.id, email: user.email, name, role: user.role },
      csrfToken,
    },
  })
}

authRoutes.post('/google', async c => {
  const ip = c.req.header('CF-Connecting-IP') || 'unknown'

  // Cloudflare Rate Limiting binding (configured under [env.production] in
  // wrangler.toml). Counters live per Cloudflare PoP, which is acceptable
  // here because brute-force traffic from a single IP is pinned to one edge.
  // The binding is intentionally optional at the type level so `wrangler
  // dev` without `--env production` boots without an edge limiter.
  if (c.env.AUTH_RATE_LIMITER) {
    const { success } = await c.env.AUTH_RATE_LIMITER.limit({ key: ip })
    if (!success) {
      return c.json(
        { success: false, error: 'Too many login attempts. Try again in 1 minute.' },
        429
      )
    }
  }

  let body: { credential?: string }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ success: false, error: 'Invalid request body' }, 400)
  }

  if (!body.credential) {
    return c.json({ success: false, error: 'Google credential is required' }, 400)
  }

  // Verify Google ID token via Google's tokeninfo endpoint
  const tokenInfoRes = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${body.credential}`
  )

  if (!tokenInfoRes.ok) {
    return c.json({ success: false, error: 'Invalid Google credential' }, 401)
  }

  const tokenInfo = (await tokenInfoRes.json()) as GoogleTokenInfo

  if (tokenInfo.email_verified !== 'true') {
    return c.json({ success: false, error: 'Google email is not verified' }, 401)
  }

  // Verify aud matches our Google Client ID to prevent token reuse from other apps
  if (tokenInfo.aud !== c.env.GOOGLE_CLIENT_ID) {
    return c.json({ success: false, error: 'Invalid token audience' }, 401)
  }

  // Check expiration
  if (Number(tokenInfo.exp) < Math.floor(Date.now() / 1000)) {
    return c.json({ success: false, error: 'Google credential has expired' }, 401)
  }

  // Check if user exists in D1 (email-based whitelist)
  const user = await c.env.DB.prepare('SELECT id, email, name, role FROM users WHERE email = ?')
    .bind(tokenInfo.email)
    .first<{ id: string; email: string; name: string; role: string }>()

  if (!user) {
    return c.json(
      {
        success: false,
        error: 'Access denied. Your email is not authorized for this application.',
      },
      403
    )
  }

  // Sync name from Google if it differs
  const displayName = tokenInfo.name || user.name
  if (tokenInfo.name && user.name !== tokenInfo.name) {
    await c.env.DB.prepare('UPDATE users SET name = ? WHERE id = ?')
      .bind(tokenInfo.name, user.id)
      .run()
  }

  return issueAuthSession(c, user, displayName)
})

// Session-restore endpoint. Returns the current user (derived from the
// HttpOnly cookie via authMiddleware) plus a fresh CSRF token. Called by the
// SPA on every boot to rehydrate Pinia state without trusting any
// JS-accessible storage. Uses a per-route authMiddleware mount because
// authRoutes is registered BEFORE the global app.use('/api/*', authMiddleware)
// in index.ts (so /google and /logout remain public).
authRoutes.get('/me', authMiddleware, async c => {
  const user = c.get('user')
  const jwtIat = c.get('jwtIat') ?? Math.floor(Date.now() / 1000)
  const csrfToken = await createCsrfToken({ sub: user.id, iat: jwtIat }, c.env.JWT_SECRET)
  return c.json({ success: true, data: { user, csrfToken } })
})

authRoutes.post('/logout', c => {
  // Clear the HttpOnly cookie unconditionally — no auth required, since
  // logging out an unauthenticated request is a no-op for the browser.
  deleteCookie(c, AUTH_COOKIE_NAME, authCookieOptions(c))
  return c.json({ success: true, data: null })
})

export default authRoutes
