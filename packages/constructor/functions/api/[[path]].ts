// F-05: Cloudflare Pages Function — transparent reverse proxy from
// `https://brand-constructor-app.pages.dev/api/*` to the Worker API.
//
// WHY THIS EXISTS
// ----------------
// `*.pages.dev` and `*.workers.dev` are separate registrable suffixes on the
// Public Suffix List, so any cookie set by the worker is third-party from
// the SPA's perspective. Safari ITP blocks third-party cookies entirely,
// and Chrome is incrementally rolling out the same restriction. To keep
// HttpOnly + SameSite=Lax auth cookies working in every browser, the SPA
// only ever talks to its own origin; this Pages Function then forwards the
// request server-to-server to the worker. Set-Cookie headers from the
// worker are returned to the browser as if they came from the Pages origin,
// so the browser stores them first-party on `brand-constructor-app.pages.dev`.
//
// CONFIG
// ------
// `WORKER_URL` can be overridden via the Pages project environment
// variables (Dashboard → Workers & Pages → brand-constructor-app →
// Settings → Variables). When unset, falls back to the production URL —
// no devops configuration is required for the default deploy.

const DEFAULT_WORKER_URL =
  'https://brand-constructor-api-production.upstars-landings.workers.dev'

interface Env {
  WORKER_URL?: string
}

interface PagesContext {
  request: Request
  env: Env
}

export async function onRequest({ request, env }: PagesContext): Promise<Response> {
  const workerBase = env.WORKER_URL || DEFAULT_WORKER_URL
  const incoming = new URL(request.url)
  const target = new URL(incoming.pathname + incoming.search, workerBase)

  const headers = new Headers(request.headers)
  // `Host` is set by the runtime to match the destination on outbound fetch.
  // Forwarding the inbound `pages.dev` Host header would corrupt the request.
  headers.delete('host')

  const method = request.method.toUpperCase()
  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: 'manual',
  }

  // Bodies are buffered (not streamed) to avoid the duplex / one-shot
  // limitations of Workers fetch when a streaming Request is forwarded
  // through another fetch. Acceptable for everything the worker accepts
  // today (JSON payloads, multipart uploads of bounded size).
  if (method !== 'GET' && method !== 'HEAD') {
    init.body = await request.arrayBuffer()
  }

  return fetch(target.toString(), init)
}
