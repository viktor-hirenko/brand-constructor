/**
 * Dev-server fallback for `/api/assets/*`: local worker first, production
 * second.
 *
 * Why it exists. `wrangler dev` binds ASSETS_BUCKET to a local R2 bucket that
 * starts empty, while a local D1 filled from a production dump points every
 * `thumbnail_url` at objects that only exist in the production bucket. Result:
 * wizard step 7 offers variants and renders every one of them broken. Asset
 * serving needs no auth (`packages/worker/src/index.ts`), so reaching for the
 * production copy is a plain GET.
 *
 * Why local comes first. Assets uploaded while working locally land in the
 * local bucket; production knows nothing about them. Asking the local worker
 * first keeps that flow intact — the fallback only covers misses.
 *
 * Why it lives in `shared`. Both dev servers need it. In unified dev the
 * browser sits on the admin origin (:5173) and the wizard runs in a
 * same-origin iframe, so images requested from inside the iframe are asked of
 * admin's dev server, not the constructor's (:5174). Wiring only the
 * constructor would leave the iframe — the layout that QA actually checks —
 * still broken.
 *
 * Plain `.mjs` on purpose: Vite leaves bare imports in `vite.config.ts`
 * external, so Node loads this file directly and a `.ts` source would not
 * import.
 */

export const ASSET_PATH_PREFIX = '/api/assets/'

/** Where `wrangler dev` listens. Matches the `/api` proxy in both vite configs. */
export const DEFAULT_WORKER_ORIGIN = 'http://localhost:8787'

/**
 * Reads the two variables that switch the fallback on. Both are declared in
 * `packages/{admin,constructor}/.env.development`, which is outside git — an
 * absent or malformed pair means "off", never "guess an origin".
 *
 * @param {Record<string, string | undefined>} [env]
 * @returns {{ enabled: boolean, prodOrigin: string }}
 */
export function readAssetFallbackEnv(env = {}) {
  const prodOrigin = String(env.VITE_PROD_API_ORIGIN ?? '')
    .trim()
    .replace(/\/+$/, '')
  const enabled = String(env.VITE_USE_PROD_ASSETS ?? '').trim() === 'true' && prodOrigin !== ''
  return { enabled, prodOrigin }
}

/**
 * The origins to try for one request, in order. An empty list means "not our
 * business" — the request falls through to the ordinary `/api` proxy, so with
 * the fallback off the dev server behaves exactly as it did before.
 *
 * @param {string | undefined} path
 * @param {{ workerOrigin?: string, prodOrigin?: string, enabled?: boolean }} [options]
 * @returns {string[]}
 */
export function resolveAssetUrls(path, options = {}) {
  const { workerOrigin = DEFAULT_WORKER_ORIGIN, prodOrigin = '', enabled = false } = options
  if (!enabled || prodOrigin === '') return []
  if (typeof path !== 'string' || !path.startsWith(ASSET_PATH_PREFIX)) return []
  return [`${workerOrigin}${path}`, `${prodOrigin}${path}`]
}

/**
 * @param {{
 *   workerOrigin?: string,
 *   prodOrigin?: string,
 *   enabled?: boolean,
 *   fetchImpl?: typeof globalThis.fetch,
 * }} [options]
 */
export function createAssetFallbackMiddleware(options = {}) {
  const {
    workerOrigin = DEFAULT_WORKER_ORIGIN,
    prodOrigin = '',
    enabled = false,
    fetchImpl = globalThis.fetch,
  } = options

  return async function assetFallbackMiddleware(req, res, next) {
    const method = String(req?.method ?? 'GET').toUpperCase()
    const urls =
      method === 'GET' ? resolveAssetUrls(req?.url, { workerOrigin, prodOrigin, enabled }) : []

    for (const url of urls) {
      let upstream
      try {
        upstream = await fetchImpl(url)
      } catch {
        continue
      }
      if (!upstream.ok) continue

      const body = new Uint8Array(await upstream.arrayBuffer())
      res.writeHead(200, {
        'Content-Type': upstream.headers.get('content-type') ?? 'application/octet-stream',
        'Content-Length': String(body.byteLength),
        // Dev only: a picture pulled from production must not outlive the
        // moment the local bucket gets its own copy of it.
        'Cache-Control': 'no-store',
      })
      res.end(body)
      return
    }

    next()
  }
}

/**
 * Vite plugin wrapper. Registered from `configureServer` without a returned
 * hook, so it runs ahead of Vite's own proxy middleware and can intercept
 * `/api/assets/*` before the blanket `/api` rule sends it to the local worker.
 *
 * @param {Parameters<typeof createAssetFallbackMiddleware>[0]} [options]
 */
export function assetFallbackPlugin(options = {}) {
  const middleware = createAssetFallbackMiddleware(options)
  return {
    name: 'brand-constructor:dev-asset-fallback',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(middleware)
    },
  }
}
