import { Hono } from 'hono'
import type { Env, Variables } from '../types'
import { createJWT } from '../utils/jwt'

const authRoutes = new Hono<{ Bindings: Env; Variables: Variables }>()

const RATE_LIMIT_WINDOW_MS = 60 * 1000
const MAX_AUTH_ATTEMPTS = 5
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
      exp: now + 24 * 60 * 60, // 24 hours
    },
    c.env.JWT_SECRET
  )

  return c.json({
    success: true,
    data: {
      token,
      user: { id: user.id, email: user.email, name: displayName, role: user.role },
    },
  })
})

authRoutes.post('/logout', c => {
  return c.json({ success: true, data: null })
})

export default authRoutes
