// Variant 3 — SPA fallback for the unified single-origin deploy.
//
// Two SPAs share one origin: Admin at '/', Wizard at '/wizard/'. We must serve
// the correct SPA shell for client-side routes of each app.
//
// Why not `_redirects`: Cloudflare's loop-detection strips `/index.html` to `/`
// and rejects the classic `/* /index.html 200` rule as an infinite loop (it is
// ignored both in `wrangler pages dev` and on the platform).
//
// Why not rely on a 404 fallback: Cloudflare Pages already serves the ROOT
// `/index.html` with status 200 for unmatched navigations, so a `/wizard/...`
// client route would silently receive the Admin shell.
//
// Strategy (deterministic): a request whose path has no file extension is a
// client-side navigation — serve the shell chosen by path prefix. Requests with
// an extension (real assets: .js, .css, .ico, ...) and every `/api/*` request
// pass straight through to normal asset / function handling.

interface PagesContext {
  request: Request
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>
}

// Matches a file extension in the last path segment, e.g. `.js`, `.css`, `.ico`.
const HAS_EXTENSION = /\.[a-zA-Z0-9]+$/

export async function onRequest(context: PagesContext): Promise<Response> {
  const { request, next } = context
  const url = new URL(request.url)

  const isNavigation =
    request.method === 'GET' &&
    !url.pathname.startsWith('/api/') &&
    !HAS_EXTENSION.test(url.pathname)

  if (!isNavigation) {
    return next()
  }

  // Request the directory path (not `/index.html`): Cloudflare Pages normalises
  // `*/index.html` to the directory with a redirect, which would yield an empty
  // body. `/wizard/` and `/` resolve to the respective index.html with 200.
  const isWizard = url.pathname === '/wizard' || url.pathname.startsWith('/wizard/')
  const shell = isWizard ? '/wizard/' : '/'

  return next(new Request(new URL(shell, url.origin), request))
}
