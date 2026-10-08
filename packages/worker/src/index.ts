import { Hono } from 'hono'
import { logger } from 'hono/logger'
import type { Env, Variables } from './types'
import { createCorsMiddleware } from './middleware/cors'
import { authMiddleware } from './middleware/auth'
import { csrfMiddleware } from './middleware/csrf'
import conceptsRoutes from './routes/concepts'
import namingsRoutes from './routes/namings'
import prPackagesRoutes from './routes/pr-packages'
import componentsRoutes from './routes/components'
import assetsRoutes from './routes/assets'
import usersRoutes from './routes/users'
import authRoutes from './routes/auth'
import brandsRoutes from './routes/brands'
import { batchCheckDomains, isPananamesConfigured } from './utils/domain-check'
import { PRICE_NIGHT_CRON, isPriceCheckEnabled, runPriceNight } from './utils/price-check'
import {
  assetKeysToTry,
  ASSET_CACHE_CONTROL,
  ASSET_FALLBACK_CACHE_CONTROL,
} from './utils/asset-small'

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

// Asset serving — public, no auth required. `?size=small` serves the small
// copy made at upload and falls back to the picture itself (utils/asset-small.ts).
app.get('/api/assets/:entityType/:entityId/:fileName', async c => {
  const key = `${c.req.param('entityType')}/${c.req.param('entityId')}/${c.req.param('fileName')}`
  const keys = assetKeysToTry(key, new URL(c.req.url))
  let object: R2ObjectBody | null = null
  let servedKey = key
  for (const candidate of keys) {
    object = await c.env.ASSETS_BUCKET.get(candidate)
    if (object) {
      servedKey = candidate
      break
    }
  }
  if (!object) {
    return c.json({ success: false, error: 'Asset not found' }, 404)
  }
  const isFallback = keys.length > 1 && servedKey !== keys[0]
  const headers = new Headers()
  headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream')
  headers.set('Cache-Control', isFallback ? ASSET_FALLBACK_CACHE_CONTROL : ASSET_CACHE_CONTROL)
  return new Response(object.body, { headers })
})

// Auth routes — public, no JWT required
app.route('/api/auth', authRoutes)

// All other /api/* routes require authentication. CSRF runs immediately
// after auth so it can read the `authMethod` / `user` / `jwtIat` context
// populated by authMiddleware. CSRF is a no-op for safe methods
// (GET/HEAD/OPTIONS); every other method must carry a valid X-CSRF-Token —
// see middleware/csrf.ts.
app.use('/api/*', authMiddleware)
app.use('/api/*', csrfMiddleware)

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
    // Its own schedule entry: the stage has no registrar key, and one firing
    // has its own allowance of requests out — the night is as many firings as
    // the list of domains needs (utils/price-check.ts).
    if (event.cron === PRICE_NIGHT_CRON) {
      if (!isPriceCheckEnabled(env)) {
        console.log('Scheduled price night: PRICE_CHECK_ENABLED is not "true", skipping')
        return
      }
      const night = await runPriceNight(env)
      if (night.job !== 'idle') console.log(`Scheduled price ${night.job} completed:`, JSON.stringify(night.summary))
      return
    }

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
