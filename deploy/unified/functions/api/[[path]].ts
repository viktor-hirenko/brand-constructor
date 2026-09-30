// Cloudflare Pages Function — transparent reverse proxy from
// `https://<unified-origin>/api/*` to the Worker API.
//
// VARIANT 3 — SINGLE ORIGIN
// -------------------------
// This is the ONE proxy for the unified Admin + Wizard deploy. Admin is served
// at `/`, the Wizard at `/wizard/*`, and both talk to their own origin's
// `/api/*`, which this function forwards server-to-server to the Worker.
//
// WHY A PROXY (unchanged rationale)
// ---------------------------------
// `*.pages.dev` and `*.workers.dev` are separate registrable suffixes on the
// Public Suffix List, so a cookie set directly by the worker is third-party
// from the SPA's perspective. Safari ITP blocks third-party cookies entirely
// and Chrome is following. Forwarding through this Pages Function makes the
// worker's `Set-Cookie` first-party on the unified origin, so the HttpOnly +
// SameSite=Lax auth cookie is shared by Admin and Wizard with a single login.
//
// CONFIG
// ------
// `WORKER_URL` is REQUIRED — set it in the Pages project environment variables
// (Dashboard -> Workers & Pages -> <project> -> Settings -> Variables ->
// Production). The proxy fails fast with a 500 if it is missing, so a
// misconfigured deploy never silently routes traffic to the wrong backend.

interface Env {
  WORKER_URL?: string
}

interface PagesContext {
  request: Request
  env: Env
  waitUntil: (promise: Promise<unknown>) => void
}

// EDGE CACHE FOR PICTURES
// -----------------------
// `GET /api/assets/*` is public and every file name is a fresh asset id, so a
// picture never changes under its URL. The Worker is reached on `*.workers.dev`,
// where the Cache API does nothing — so pictures are cached HERE, on the
// Cloudflare node that answers the browser. The Worker's own `Cache-Control`
// decides how long (a year; a day for a small-copy fallback, see
// packages/worker/src/utils/asset-small.ts). Nothing else under `/api` is
// cached: it is per-user and `no-store`.
//
// `X-Edge-Cache: HIT | MISS` says which way the answer came.
function isCacheableAssetRequest(request: Request): boolean {
  if (request.method.toUpperCase() !== 'GET') return false
  return new URL(request.url).pathname.startsWith('/api/assets/')
}

async function serveAssetFromEdge(
  request: Request,
  fetchFromWorker: () => Promise<Response>,
  waitUntil: (promise: Promise<unknown>) => void
): Promise<Response> {
  // The key is the URL alone: cookies and other headers must not split it.
  const cacheKey = new Request(request.url, { method: 'GET' })
  const cache = (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default
  if (!cache) return fetchFromWorker()
  const cached = await cache.match(cacheKey)
  if (cached) {
    const hit = new Response(cached.body, cached)
    hit.headers.set('X-Edge-Cache', 'HIT')
    return hit
  }
  const fresh = await fetchFromWorker()
  const response = new Response(fresh.body, fresh)
  if (response.status === 200) {
    waitUntil(cache.put(cacheKey, response.clone()))
  }
  response.headers.set('X-Edge-Cache', 'MISS')
  return response
}

export async function onRequest(context: PagesContext): Promise<Response> {
  const { request, env } = context
  const workerBase = env.WORKER_URL
  if (!workerBase) {
    return new Response(
      JSON.stringify({
        success: false,
        error:
          'Pages proxy misconfigured: WORKER_URL environment variable is not set. ' +
          'Set it in the Cloudflare Pages dashboard (Settings → Variables → Production).',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const incoming = new URL(request.url)
  const target = new URL(incoming.pathname + incoming.search, workerBase)

  const headers = new Headers(request.headers)
  // `Host` is set by the runtime to match the destination on outbound fetch.
  // Forwarding the inbound Host header would corrupt the request.
  headers.delete('host')

  const method = request.method.toUpperCase()
  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: 'manual',
  }

  // Bodies are buffered (not streamed) to avoid the duplex / one-shot
  // limitations of Workers fetch when forwarding a streaming Request.
  if (method !== 'GET' && method !== 'HEAD') {
    init.body = await request.arrayBuffer()
  }

  if (isCacheableAssetRequest(request)) {
    return serveAssetFromEdge(
      request,
      () => fetch(target.toString(), init),
      promise => context.waitUntil(promise)
    )
  }

  return fetch(target.toString(), init)
}
