import { Hono } from 'hono'
import { setCookie, deleteCookie } from 'hono/cookie'
import type { Context } from 'hono'
import type { Env, Variables } from '../types'
import { createJWT } from '../utils/jwt'
import { createCsrfToken } from '../utils/csrf'
import { authMiddleware, AUTH_COOKIE_NAME } from '../middleware/auth'

const authRoutes = new Hono<{ Bindings: Env; Variables: Variables }>()

const RATE_LIMIT_WINDOW_MS = 60 * 1000
const MAX_AUTH_ATTEMPTS = 5
const TOKEN_LIFETIME_SEC = 24 * 60 * 60
const attempts = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = attempts.get(ip)

  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  if (entry.count >= MAX_AUTH_ATTEMPTS) return true

  entry.count++
  return false
}

interface GoogleTokenInfo {
  email: string
  email_verified: string
  name: string
  picture?: string
  exp: string
  aud: string
  sub: string
}

// F-05: cookie attributes used both on login (set) and logout (clear).
// `Secure` is disabled in development so the cookie still flows over plain
// HTTP from `vite dev` → `wrangler dev`. The dev path of authMiddleware
// short-circuits via X-Dev-User-Email anyway, so this only matters for
// staging-style testing that exercises the real cookie flow against a
// local worker.
function authCookieOptions(c: Context<{ Bindings: Env; Variables: Variables }>) {
  const isDev = c.env.ENVIRONMENT === 'development'
  return {
    path: '/',
    httpOnly: true,
    secure: !isDev,
    sameSite: 'Lax' as const,
  }
}

authRoutes.post('/google', async c => {
  const ip = c.req.header('CF-Connecting-IP') || 'unknown'

  if (isRateLimited(ip)) {
    return c.json({ success: false, error: 'Too many login attempts. Try again in 1 minute.' }, 429)
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

  const now = Math.floor(Date.now() / 1000)
  const token = await createJWT(
    {
      sub: user.id,
      email: user.email,
      name: displayName,
      role: user.role,
      iat: now,
      exp: now + TOKEN_LIFETIME_SEC,
    },
    c.env.JWT_SECRET
  )

  // F-05: write the JWT into an HttpOnly Secure SameSite=Lax cookie so the
  // SPA never holds it in JS-accessible memory or storage.
  setCookie(c, AUTH_COOKIE_NAME, token, {
    ...authCookieOptions(c),
    maxAge: TOKEN_LIFETIME_SEC,
  })

  const csrfToken = await createCsrfToken({ sub: user.id, iat: now }, c.env.JWT_SECRET)

  return c.json({
    success: true,
    data: {
      user: { id: user.id, email: user.email, name: displayName, role: user.role },
      csrfToken,
    },
  })
})

// F-05: session-restore endpoint. Returns the current user (derived from the
// HttpOnly cookie via authMiddleware) plus a fresh CSRF token. Called by the
// SPA on every app boot to rehydrate Pinia state without trusting any
// JS-accessible storage. Uses the per-route authMiddleware mount because
// authRoutes is registered BEFORE the global app.use('/api/*', authMiddleware)
// in index.ts (so /google and /logout remain public).
authRoutes.get('/me', authMiddleware, async c => {
  const user = c.get('user')
  const jwtIat = c.get('jwtIat') ?? Math.floor(Date.now() / 1000)
  const csrfToken = await createCsrfToken({ sub: user.id, iat: jwtIat }, c.env.JWT_SECRET)
  return c.json({ success: true, data: { user, csrfToken } })
})

authRoutes.post('/logout', c => {
  // F-05: clear the HttpOnly cookie unconditionally (no auth required —
  // logging out an unauthenticated request is a no-op for the browser).
  deleteCookie(c, AUTH_COOKIE_NAME, authCookieOptions(c))
  return c.json({ success: true, data: null })
})

export default authRoutes
