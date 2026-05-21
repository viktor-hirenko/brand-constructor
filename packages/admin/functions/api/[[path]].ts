// Cloudflare Pages Function — transparent reverse proxy from
// `https://brand-constructor.pages.dev/api/*` to the Worker API.
//
// See packages/constructor/functions/api/[[path]].ts for the full
// rationale (cookie first-partyness across pages.dev vs workers.dev) and
// the note on the required `WORKER_URL` env var. This file is the
// byte-for-byte equivalent for the admin SPA (brand-constructor.pages.dev)
// — kept duplicated rather than shared because each Pages project is
// deployed independently and there is no monorepo-level shared functions
// directory.

interface Env {
  WORKER_URL?: string
}

interface PagesContext {
  request: Request
  env: Env
}

export async function onRequest({ request, env }: PagesContext): Promise<Response> {
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
  headers.delete('host')

  const method = request.method.toUpperCase()
  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: 'manual',
  }

  if (method !== 'GET' && method !== 'HEAD') {
    init.body = await request.arrayBuffer()
  }

  return fetch(target.toString(), init)
}
