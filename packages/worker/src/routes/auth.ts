import { Hono } from 'hono'
import { deleteCookie } from 'hono/cookie'
import type { Context } from 'hono'
import type { Env, Variables } from '../types'
import { createCsrfToken } from '../utils/csrf'
import { authMiddleware } from '../middleware/auth'
import {
  AUTH_COOKIE_NAME,
  SESSION_ABSOLUTE_SEC,
  SESSION_IDLE_SEC,
  authCookieOptions,
  mintSessionCookie,
} from '../utils/session'
import { corporateEmailDenialMessage, isCorporateEmailAllowed } from '../utils/email-access'
import { logAuthLoginAttempt } from '../utils/auth-login-log'

const authRoutes = new Hono<{ Bindings: Env; Variables: Variables }>()

interface GoogleTokenInfo {
  email: string
  email_verified: string
  name: string
  picture?: string
  exp: string
  aud: string
  sub: string
}

interface AuthUserRow {
  id: string
  email: string
  name: string
  role: string
}

/**
 * Start a brand-new session: mint the auth cookie and hand the SPA its
 * matching CSRF token. Session lifetime policy (idle window, absolute cap,
 * sliding refresh) lives in `utils/session.ts`.
 */
async function issueAuthSession(
  c: Context<{ Bindings: Env; Variables: Variables }>,
  user: AuthUserRow,
  displayName?: string
) {
  const name = displayName ?? user.name
  const { sid } = await mintSessionCookie(c, { ...user, name })
  const csrfToken = await createCsrfToken({ sub: user.id, sid }, c.env.JWT_SECRET)

  return c.json({
    success: true,
    data: {
      user: { id: user.id, email: user.email, name, role: user.role },
      csrfToken,
      session: { idleSeconds: SESSION_IDLE_SEC, absoluteSeconds: SESSION_ABSOLUTE_SEC },
    },
  })
}

authRoutes.post('/google', async c => {
  const ip = c.req.header('CF-Connecting-IP') || 'unknown'
  const allowedEmailDomains = c.env.ALLOWED_EMAIL_DOMAINS

  // Cloudflare Rate Limiting binding (configured under [env.production] in
  // wrangler.toml). Counters live per Cloudflare PoP, which is acceptable
  // here because brute-force traffic from a single IP is pinned to one edge.
  // The binding is intentionally optional at the type level so `wrangler
  // dev` without `--env production` boots without an edge limiter.
  if (c.env.AUTH_RATE_LIMITER) {
    const { success } = await c.env.AUTH_RATE_LIMITER.limit({ key: ip })
    if (!success) {
      logAuthLoginAttempt({ outcome: 'rate_limited', ip, httpStatus: 429 })
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
    logAuthLoginAttempt({ outcome: 'invalid_body', ip, httpStatus: 400 })
    return c.json({ success: false, error: 'Invalid request body' }, 400)
  }

  if (!body.credential) {
    logAuthLoginAttempt({ outcome: 'missing_credential', ip, httpStatus: 400 })
    return c.json({ success: false, error: 'Google credential is required' }, 400)
  }

  // Verify Google ID token via Google's tokeninfo endpoint
  const tokenInfoRes = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${body.credential}`
  )

  if (!tokenInfoRes.ok) {
    logAuthLoginAttempt({ outcome: 'invalid_google_credential', ip, httpStatus: 401 })
    return c.json({ success: false, error: 'Invalid Google credential' }, 401)
  }

  const tokenInfo = (await tokenInfoRes.json()) as GoogleTokenInfo

  if (tokenInfo.email_verified !== 'true') {
    logAuthLoginAttempt({
      outcome: 'email_not_verified',
      ip,
      email: tokenInfo.email,
      googleSub: tokenInfo.sub,
      httpStatus: 401,
      allowedEmailDomains,
    })
    return c.json({ success: false, error: 'Google email is not verified' }, 401)
  }

  // Verify aud matches our Google Client ID to prevent token reuse from other apps
  if (tokenInfo.aud !== c.env.GOOGLE_CLIENT_ID) {
    logAuthLoginAttempt({
      outcome: 'invalid_audience',
      ip,
      email: tokenInfo.email,
      googleSub: tokenInfo.sub,
      httpStatus: 401,
      allowedEmailDomains,
    })
    return c.json({ success: false, error: 'Invalid token audience' }, 401)
  }

  // Check expiration
  if (Number(tokenInfo.exp) < Math.floor(Date.now() / 1000)) {
    logAuthLoginAttempt({
      outcome: 'expired_credential',
      ip,
      email: tokenInfo.email,
      googleSub: tokenInfo.sub,
      httpStatus: 401,
      allowedEmailDomains,
    })
    return c.json({ success: false, error: 'Google credential has expired' }, 401)
  }

  // Corporate domain gate (toggleable via ALLOWED_EMAIL_DOMAINS).
  if (!isCorporateEmailAllowed(tokenInfo.email, allowedEmailDomains)) {
    logAuthLoginAttempt({
      outcome: 'domain_not_allowed',
      ip,
      email: tokenInfo.email,
      googleSub: tokenInfo.sub,
      httpStatus: 403,
      allowedEmailDomains,
    })
    return c.json(
      { success: false, error: corporateEmailDenialMessage(allowedEmailDomains) },
      403
    )
  }

  // Check if user exists in D1 (email-based whitelist)
  const user = await c.env.DB.prepare('SELECT id, email, name, role FROM users WHERE email = ?')
    .bind(tokenInfo.email)
    .first<{ id: string; email: string; name: string; role: string }>()

  if (!user) {
    logAuthLoginAttempt({
      outcome: 'not_whitelisted',
      ip,
      email: tokenInfo.email,
      googleSub: tokenInfo.sub,
      httpStatus: 403,
      allowedEmailDomains,
    })
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

  logAuthLoginAttempt({
    outcome: 'success',
    ip,
    email: user.email,
    googleSub: tokenInfo.sub,
    httpStatus: 200,
    allowedEmailDomains,
  })

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
  const sid = c.get('sessionAnchor') ?? Math.floor(Date.now() / 1000)
  const csrfToken = await createCsrfToken({ sub: user.id, sid }, c.env.JWT_SECRET)
  return c.json({
    success: true,
    data: {
      user,
      csrfToken,
      session: { idleSeconds: SESSION_IDLE_SEC, absoluteSeconds: SESSION_ABSOLUTE_SEC },
    },
  })
})

authRoutes.post('/logout', c => {
  // Clear the HttpOnly cookie unconditionally — no auth required, since
  // logging out an unauthenticated request is a no-op for the browser.
  deleteCookie(c, AUTH_COOKIE_NAME, authCookieOptions(c))
  return c.json({ success: true, data: null })
})

export default authRoutes
