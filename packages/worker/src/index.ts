import { Hono } from 'hono'
import { logger } from 'hono/logger'
import type { Env, Variables } from './types'
import { createCorsMiddleware } from './middleware/cors'
import { authMiddleware } from './middleware/auth'
import conceptsRoutes from './routes/concepts'
import namingsRoutes from './routes/namings'
import prPackagesRoutes from './routes/pr-packages'
import componentsRoutes from './routes/components'
import assetsRoutes from './routes/assets'
import usersRoutes from './routes/users'
import authRoutes from './routes/auth'
import brandsRoutes from './routes/brands'
import { batchCheckDomains, isPananamesConfigured } from './utils/domain-check'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

app.use('*', logger())
app.use('*', createCorsMiddleware())

// Security + cache headers on all responses
app.use('*', async (c, next) => {
  await next()
  c.res.headers.set('X-Content-Type-Options', 'nosniff')
  c.res.headers.set('X-Frame-Options', 'DENY')
  c.res.headers.set('X-XSS-Protection', '1; mode=block')
  c.res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.res.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' https://accounts.google.com https://apis.google.com; frame-src https://accounts.google.com; connect-src 'self' https://oauth2.googleapis.com https://accounts.google.com"
  )
  const path = new URL(c.req.url).pathname
  if (path.startsWith('/api/') && !path.includes('/assets/')) {
    c.res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    c.res.headers.set('Pragma', 'no-cache')
  }
})

app.get('/api/health', c => {
  return c.json({ status: 'ok', version: '0.1.0', timestamp: new Date().toISOString() })
})

app.get('/api/debug/pananames', async c => {
  const signature = c.env.PANANAMES_SIGNATURE
  const hasSignature = Boolean(signature)
  const signaturePreview = signature
    ? `${signature.slice(0, 8)}...${signature.slice(-8)}`
    : null

  const testDomain = 'testdomain12345xyz.com'
  const results: Record<string, string> = {}

  if (hasSignature) {
    try {
      const resp = await fetch(
        `https://api.pananames.com/merchant/v2/domains/${testDomain}/check`,
        {
          headers: { SIGNATURE: signature, Accept: 'application/json' },
        }
      )
      const body = await resp.text()
      results['check_domain'] = `HTTP ${resp.status}: ${body.slice(0, 300)}`
    } catch (e) {
      results['check_domain'] = `fetch error: ${e}`
    }
  }

  return c.json({ hasSignature, signaturePreview, results })
})

// Asset serving — public, no auth required
app.get('/api/assets/:entityType/:entityId/:fileName', async c => {
  const key = `${c.req.param('entityType')}/${c.req.param('entityId')}/${c.req.param('fileName')}`
  const object = await c.env.ASSETS_BUCKET.get(key)
  if (!object) {
    return c.json({ success: false, error: 'Asset not found' }, 404)
  }
  const headers = new Headers()
  headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream')
  headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  return new Response(object.body, { headers })
})

// Auth routes — public, no JWT required
app.route('/api/auth', authRoutes)

// All other /api/* routes require authentication
app.use('/api/*', authMiddleware)

app.route('/api/concepts', conceptsRoutes)
app.route('/api/namings', namingsRoutes)
app.route('/api/pr-packages', prPackagesRoutes)
app.route('/api/components', componentsRoutes)
app.route('/api/assets', assetsRoutes)
app.route('/api/users', usersRoutes)
app.route('/api/brands', brandsRoutes)

app.notFound(c => {
  return c.json({ success: false, error: 'Not Found' }, 404)
})

app.onError((err, c) => {
  console.error('Unhandled error:', err)
  return c.json({ success: false, error: 'Internal Server Error' }, 500)
})

export default {
  fetch: app.fetch,

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    if (!isPananamesConfigured(env)) {
      console.log('Scheduled domain check: Pananames API signature not configured, skipping')
      return
    }

    console.log('Scheduled domain check started:', new Date().toISOString())
    ctx.waitUntil(
      batchCheckDomains(env).then(({ checked, updated }) => {
        console.log(`Scheduled domain check completed: ${checked} checked, ${updated} updated`)
      })
    )
  },
}
