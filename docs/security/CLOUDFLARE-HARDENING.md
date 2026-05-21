# Cloudflare hardening checklist — Brand Constructor

> Companion to the 2026-05-21 external security review (Anton Zasteba).
> Purpose: list every Cloudflare Dashboard / DevOps action that **cannot**
> be closed by a code change in this repo. Each item is the "definition of
> done" the review can use for sign-off.
>
> Code-level findings F-01 through F-29 are tracked separately in
> `docs/audits/enterprise-audit-brand-constructor.md`. The items below are
> the **runtime / platform** complement to that file.

---

## P0 — must be done before sign-off

### 1. Rotate `PANANAMES_SIGNATURE`

The old `/api/debug/pananames` endpoint (F-01) leaked the first/last 8
characters of the production Pananames signature. The endpoint is gone in
code, but the historical secret value must be assumed compromised.

```bash
# Generate a new signature in the Pananames merchant console first, then:
wrangler secret put PANANAMES_SIGNATURE --env production
# Paste the new value when prompted. Old value becomes inert immediately.
```

Verify: `wrangler secret list --env production` shows the new
`updated_at` timestamp.

---

### 2. Set `WORKER_URL` on both Pages projects

F-29 made `WORKER_URL` a **required** env var on the Pages proxy. Without
it the SPA returns a 500 on every `/api/*` call.

- Dashboard → Workers & Pages → `brand-constructor` → Settings →
  Variables → Production → add `WORKER_URL =
  https://brand-constructor-api-production.upstars-landings.workers.dev`
  (or, once custom domain lands — see item 5 — the new internal URL).
- Repeat for the `brand-constructor-app` Pages project.
- Trigger a fresh Pages deploy so the new env var is picked up.

Verify:
```bash
curl https://brand-constructor.pages.dev/api/health
# → { "status": "ok", ... }
```

---

### 3. Cloudflare Access in front of all three services

This is the most impactful single change. With Access enforced, every
finding tied to public reachability (dev bypass, debug endpoints, public
assets) is mitigated at the platform level, before traffic touches the
application code.

Zero Trust → Access → Applications → **Add an application** ×3:

| App | Type | Hostname | Policy |
|-----|------|----------|--------|
| `bc-api` | Self-hosted | `api.brand-constructor.internal.upstars.com` (or current `*.workers.dev` during rollout) | Google Workspace IdP → emails ending `@upstars.com` |
| `bc-admin` | Self-hosted | `admin.brand-constructor.internal.upstars.com` (or `brand-constructor.pages.dev`) | same |
| `bc-app` | Self-hosted | `app.brand-constructor.internal.upstars.com` (or `brand-constructor-app.pages.dev`) | same |

Rollout tip: apply Access to the **admin** SPA first (smallest user base),
verify everyone with `@upstars.com` can log in through both Access and
Google OAuth, then extend to constructor + API.

> If the Pages proxy is enabled (it is — see [packages/constructor/functions/api/[[path]].ts](../../packages/constructor/functions/api/[[path]].ts)), the **server-to-server** call from the Pages Function to the worker is **not** intercepted by Access — only browser→edge traffic is. To also gate the worker behind Access, configure the Pages Function to forward an Access service token (or move to a Cloudflare Tunnel between Pages and the worker). Out of scope for the first iteration; for now, gating the two Pages SPAs is sufficient because the only user-facing entry points are the Pages origins.

---

## P1 — strongly recommended

### 4. Custom internal domains

Replace `*.pages.dev` / `*.workers.dev` in the user-visible URL bar:

- `api.brand-constructor.internal.upstars.com` → worker
  `brand-constructor-api-production`
- `admin.brand-constructor.internal.upstars.com` → Pages
  `brand-constructor`
- `app.brand-constructor.internal.upstars.com` → Pages
  `brand-constructor-app`

DNS: CNAMEs into the existing Cloudflare records.

After the domains attach:

1. Update Pages env var `WORKER_URL` (item 2) to the new
   `api.brand-constructor.internal.upstars.com`.
2. Update worker `CORS_ORIGINS` in
   [packages/worker/wrangler.toml](../../packages/worker/wrangler.toml)
   `[env.production]` to the two new admin/app hostnames, then redeploy
   the worker.
3. Run the smoke checklist below.

---

### 5. Disable public `*.workers.dev` / `*.pages.dev` routes

Once item 4 is in place:

- Dashboard → Workers → `brand-constructor-api` → Settings → Triggers →
  toggle off **"workers.dev route"**.
- Dashboard → Workers & Pages → `brand-constructor` → Custom Domains →
  remove `brand-constructor.pages.dev` from the project (or leave it but
  apply an Access policy that denies everything).
- Same for `brand-constructor-app`.

This is the action the external review explicitly recommends: the public
`*.workers.dev` / `*.pages.dev` hostnames currently surface in the SPA
bundle and are reachable by anyone who finds them. After this step there
is **no** non-Access path into the service.

---

### 6. Confirm/decide on `head_dhc` admin scope

The external review flagged that `head_dhc` can create/delete users —
"should be admin-only". This is a product decision, not a security
default, but it lives next to the rest of the review and should be
closed in the same pass.

Current code:

```33:33:packages/shared/src/constants/roles.ts
export const ADMIN_ROLES = [USER_ROLES.ADMIN, USER_ROLES.HEAD_DHC] as const;
```

Used in [packages/worker/src/routes/users.ts](../../packages/worker/src/routes/users.ts) via `requireAdmin`.

Decision needed: keep `head_dhc` as a co-admin, or tighten `users.ts`
endpoints (`POST /`, `PUT /:id`, `DELETE /:id`) to `admin` only. Track as
a separate finding once product responds.

---

### 7. Audit production users

Production `users` table is the email allow-list — anyone in there can
log into the admin SPA via Google. Verify:

```bash
wrangler d1 execute brand-constructor-db --remote --env production \
  --command "SELECT email, role, created_at FROM users ORDER BY created_at"
```

Remove any seed / test entries. Confirm the role distribution matches
the current org chart.

---

## P2 — nice to have

### 8. Workers Observability for the rate limiter

Once the new `AUTH_RATE_LIMITER` binding (F-27) is live, add a Workers
Analytics Engine binding and emit a `auth_rate_limited` event whenever
`AUTH_RATE_LIMITER.limit().success === false`. Lets you graph brute-force
attempts over time.

### 9. Branch protection for `wrangler.toml`

Add a `CODEOWNERS` entry so any change to
[packages/worker/wrangler.toml](../../packages/worker/wrangler.toml)
requires review — this is the file that gates production bindings.

```
packages/worker/wrangler.toml @brand-constructor-leads
```

---

## Smoke checklist after applying P0–P1

Run from a logged-out browser:

| # | Step | Expected |
|---|------|----------|
| 1 | Open admin URL | Cloudflare Access login → Google → admin SPA login |
| 2 | DevTools → Application → Cookies | `auth_token` exists, `HttpOnly`, `Secure`, `SameSite=Lax` |
| 3 | DevTools → Local Storage | no `brand_constructor_auth` key (F-05 cleanup) |
| 4 | `curl -i https://api.<internal>/api/health` (no Access cookie) | Access redirect, NOT 200 |
| 5 | `curl https://brand-constructor.pages.dev/...` (old domain, if still attached) | Access redirect or 404 / DNS failure |
| 6 | `curl https://brand-constructor-api-production.upstars-landings.workers.dev/api/health` (after disabling workers.dev) | DNS failure / 1014 |
| 7 | 6× rapid `POST /api/auth/google` with bad credential | 6th returns 429 (F-27 RateLimit binding) |
| 8 | Upload SVG via admin SPA | 400 "Unsupported file type. Allowed: PNG, JPEG, WebP." (F-28) |

If items 4–6 do not block traffic as expected, the corresponding step
above (Access policy / DNS removal / workers.dev disable) was not fully
applied.

---

## What is **already** closed in code (do not re-litigate)

| Finding | Where | When |
|---|---|---|
| `/api/debug/pananames` removed | [packages/worker/src/index.ts](../../packages/worker/src/index.ts) | F-01, 2026-05-20 |
| `VITE_ENVIRONMENT === 'development'` router bypass | router `index.ts` × 2 | F-02, 2026-05-20 |
| Frontend RBAC on `/users` | `packages/admin/src/router/index.ts` | F-03, 2026-05-20 |
| JWT in `localStorage` | HttpOnly + CSRF + Pages proxy | F-05, 2026-05-21 |
| Non-atomic approve flow | `routes/brands.status.ts` | F-04, 2026-05-21 |
| **Dev-mode `X-Dev-User-Email` bypass** | `middleware/auth.ts`, `middleware/csrf.ts`, `types.ts` | **F-25, 2026-05-21** |
| **Shared default-env D1 / R2** | [packages/worker/wrangler.toml](../../packages/worker/wrangler.toml) | **F-26, 2026-05-21** |
| **In-memory rate limit `Map`** | `routes/auth.ts` + Cloudflare RateLimit binding | **F-27, 2026-05-21** |
| **SVG upload XSS surface** | `shared/constants/assets.ts`, `worker/utils/asset-validation.ts`, `worker/utils/r2.ts`, frontend `accept` attrs | **F-28, 2026-05-21** |
| **Pages proxy hard-coded workers.dev fallback** | `{constructor,admin}/functions/api/[[path]].ts` | **F-29, 2026-05-21** |

---

## Reviewer contact

Re-review owner: **Anton Zasteba** (external security).
Code-side owner: project leads (see CODEOWNERS).

Last updated: 2026-05-21.
