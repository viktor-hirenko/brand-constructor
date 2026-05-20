# Enterprise Audit Tracker — Brand Constructor

> **Source-of-truth findings:** `docs/audit/ENTERPRISE-AUDIT-2026-05-20.md`
> **Tracker started:** 2026-05-20
> **Purpose:** Self-contained progress log for staged execution of the audit roadmap.
> Each new chat should be able to read this file alone and continue the work.

---

## How to use this file

1. Always update **Current Progress** after each finding is closed (or after a status change).
2. Per-finding subsection records: status, what changed, files, verification, manual QA, suggested commit, recommended next step.
3. Statuses:
   - **TODO** — not started
   - **IN_PROGRESS** — analysis or implementation underway
   - **DONE** — code merged, audit verified
   - **BLOCKED** — needs decision / external info
   - **NEEDS_VERIFICATION** — code merged but waiting on runtime / QA check
   - **SKIPPED** — confirmed irrelevant (record reason)
4. Model recommendation per finding:
   - **Sonnet Thinking** — small targeted fixes (security flag, router guard, logging, debounce, db.batch wrap).
   - **Opus 4.7** — large structural refactors (Step10 decomposition, store split, brands.ts split, CEO/PO unification, JWT cookie migration).
   - **Auto** — not recommended for anything beyond trivial.

---

## Current Progress

- **Completed findings:** F-02 ✅ (commit: see git log)
- **In progress:** —
- **Next recommended finding:** F-01 — close/remove public `/api/debug/pananames`
- **Recommended model for next step:** Sonnet Thinking
- **Last update:** 2026-05-20

### Open follow-ups noted during prior findings

- _(F-02 scope extension, optional)_: `packages/constructor/src/stores/auth.ts:92`, `packages/frontend/src/stores/auth.ts:85`, `packages/frontend/src/App.vue:23`, `packages/frontend/src/components/ui/AppSidebar.vue:21` still use the runtime `VITE_ENVIRONMENT` flag. They are **fail-closed** (no security regression from env typo), so they were intentionally left out of F-02. Worth normalising in a future cleanup pass — track under F-20 (`logSilent`) or a dedicated small ticket.

### Phase plan

**Phase 1 — Low-risk security & quick wins (Sonnet Thinking):**
F-02 → F-01 → F-03 → F-14 → F-17 → F-20

**Phase 2 — Medium structural cleanup (Sonnet Thinking, can be batched per chat):**
F-12 → F-13 → F-16 → F-18 → F-19 → F-15

**Phase 3 — Large structural refactors (Opus 4.7, one finding per chat, do NOT start without explicit user instruction):**
F-06 (split into 3 PRs) → F-07 → F-11 → F-10 → F-09 → F-08 → F-04 → F-05

> F-04 (atomic approve flow) is critical/security but touches the most fragile worker path; promoted to Opus-only despite being M-sized.

---

## Findings

### F-01 — Public `/api/debug/pananames` leaks signature & enables SSRF
- **Status:** TODO
- **Severity:** 🔴 Critical
- **Phase:** 1 (low-risk security)
- **Model recommendation:** Sonnet Thinking
- **Target files:** `packages/worker/src/index.ts:43-69` (handler), `packages/worker/src/index.ts:88` (auth middleware position)
- **Problem:** `/api/debug/pananames` is registered before `app.use('/api/*', authMiddleware)`. Anonymous callers get `signaturePreview` (first/last 8 chars of secret) and trigger an outbound HTTP call to Pananames on our worker.
- **Recommended change:** Either delete the handler (preferred if it was one-off debug) OR move it under `authMiddleware` + wrap with `requireAdmin` and stop returning `signaturePreview`.
- **Verification steps:**
  1. `pnpm --filter @brand-constructor/worker build` (no type errors).
  2. (Manual) Confirm the handler was not used by any cron/external monitor.
- **Notes:** Confirmed reachable without auth in current code path (registration order in `worker/src/index.ts`).
- **Date completed:** —
- **Files changed:** —
- **Verification result:** —
- **Suggested commit message:** _(TBD on close)_

---

### F-02 — Replace runtime `VITE_ENVIRONMENT === 'development'` with `import.meta.env.DEV`
- **Status:** DONE
- **Date completed:** 2026-05-20
- **Severity:** 🔴 Critical
- **Phase:** 1 (low-risk security)
- **Model used:** Sonnet Thinking
- **Files changed:**
  - `packages/constructor/src/router/index.ts` (line 311 area — replaced runtime flag + added explanatory comment)
  - `packages/frontend/src/router/index.ts` (line 66 area — same swap + comment)
- **Summary of changes:** Two-line semantic swap. Global `router.beforeEach` no longer reads `import.meta.env.VITE_ENVIRONMENT`; it now branches on `import.meta.env.DEV`, a Vite compile-time constant that is statically `false` in `vite build`. An env-variable typo on the deploy can no longer disable RBAC at runtime.
- **Verification commands run:**
  ```
  pnpm --filter @brand-constructor/constructor type-check   # ✓ 0 errors (4.0s)
  pnpm --filter @brand-constructor/frontend type-check      # ✓ 0 errors (2.4s)
  pnpm --filter @brand-constructor/constructor build        # ✓ built in 3.96s (no new warnings)
  pnpm --filter @brand-constructor/frontend build           # ✓ built in 1.19s
  ```
- **Verification result:** Both packages type-check and build cleanly. Lint (ReadLints) on the two touched files: 0 errors. Bundle layout for constructor is unchanged (`pdfmake`/`vfs_fonts` still ship as separate lazy chunks).
- **Manual QA checklist (recommended after deploy):**
  - Run `vite dev` locally for both apps → unauthenticated visit to `/constructor/step/1` and `/users` still passes (dev bypass active because `DEV=true`).
  - Production build smoke: unauthenticated visit to `/constructor/step/1` redirects to `/login`, unauthenticated visit to `/users` redirects to `/login`.
  - Authenticated PO opens `/constructor` → still routed correctly through existing per-route guards.
- **Risks / notes:**
  - Out-of-scope (intentional): the same runtime flag is still used in 4 non-security places (`stores/auth.ts` × 2, `App.vue:23`, `AppSidebar.vue:21`). They are fail-closed; no security regression. Tracked in the "Open follow-ups" list above.
  - No behavioural change is expected for either environment given correctly-set `.env.production` / `.env`. The fix only hardens the failure mode.
- **Suggested commit message:**
  ```
  fix(router,security): drop runtime VITE_ENVIRONMENT bypass, use import.meta.env.DEV

  Both SPA routers (constructor + frontend admin) started beforeEach with
  `if (import.meta.env.VITE_ENVIRONMENT === 'development') return true`,
  which disabled every auth/role guard. A typo in `.env.production` or
  CI env injection could silently turn off RBAC in production.

  Vite's `import.meta.env.DEV` is a compile-time constant — statically
  `false` for `vite build`. The bypass is now tree-shaken out of any
  production bundle and cannot be reactivated via env variables.

  Refs: docs/audits/enterprise-audit-brand-constructor.md F-02
  ```

---

### F-03 — Frontend admin SPA missing role-based route guards
- **Status:** TODO
- **Severity:** 🔴 Critical
- **Phase:** 1
- **Model recommendation:** Sonnet Thinking
- **Target files:** `packages/frontend/src/router/index.ts`
- **Problem:** Only `isAuthenticated` is checked. `/users`, `/components`, `/concepts` etc. are reachable by any logged-in role (`product_owner`, `strategy_identity`, …). Worker returns 403 but UI still mounts the page.
- **Recommended change:** Add `meta.roles: string[]` to admin routes; in `beforeEach` after auth check compare `authStore.user.role` to `to.meta.roles`. Source the role lists from `packages/shared` (`ADMIN_ROLES`, etc.).
- **Verification steps:** type-check + manual login as non-admin and try navigating directly to `/users`.
- **Notes:** Touches navigation; medium risk because misconfigured `meta.roles` will lock users out. Start with denylist of clearly admin-only routes.

---

### F-04 — Non-atomic approve flow in `PATCH /:id/status`
- **Status:** TODO
- **Severity:** 🔴 Critical
- **Phase:** 3 (promoted from S-sized due to fragility of CEO/approve flow)
- **Model recommendation:** Opus 4.7
- **Target files:** `packages/worker/src/routes/brands.ts:911-1239` (particularly 966-988 + 1135-1198)
- **Problem:** Brand status flips to `approved` in a standalone UPDATE; library marking (concepts/external/internal/pr_packages → `status='used'`) happens in a separate batch later. If the batch fails after status update, the same library item can be picked again for another brand.
- **Recommended change:** Single `db.batch([...])` with status update + library marks; only enqueue Slack `waitUntil` after batch succeeds.
- **Notes:** Touches approve flow (CEO/PO). Per workflow rules, do NOT take this in a Sonnet Thinking session.

---

### F-05 — JWT in `localStorage` (XSS exposure)
- **Status:** TODO
- **Severity:** 🔴 Critical
- **Phase:** 3
- **Model recommendation:** Opus 4.7
- **Target files:** `packages/constructor/src/stores/auth.ts`, `packages/constructor/src/composables/useApi.ts`, `packages/frontend/src/stores/auth.ts`, `packages/worker/src/routes/auth.ts`
- **Problem:** Token persisted in `localStorage`; XSS = full account takeover.
- **Recommended change:** HttpOnly Secure SameSite=Strict cookie issued by worker; remove `getAuthHeader`; CSRF via header token from meta tag.
- **Notes:** Coordinated frontend + backend change; needs design discussion before implementation. Confirm absence of `v-html` on user-content first.

---

### F-06 — `Step10ReviewSubmit.vue` decomposition (2463 lines)
- **Status:** TODO
- **Severity:** 🟡 Important
- **Phase:** 3 (split into 3 PRs)
- **Model recommendation:** Opus 4.7
- **Target files:** `packages/constructor/src/views/steps/Step10ReviewSubmit.vue`
- **Sub-PRs:**
  1. Confirm + delete legacy `v-else` (lines 1758-2439).
  2. Extract inline SVG icon set.
  3. Extract `usePrintBrandData()` composable.
- **Notes:** Touches all five review modes. Strict Opus 4.7. Do not start without explicit user instruction.

---

### F-07 — `ConstructorLayout.vue` (1345 lines): extract right-panel previews
- **Status:** TODO
- **Severity:** 🟡 Important
- **Phase:** 3
- **Model recommendation:** Opus 4.7
- **Target files:** `packages/constructor/src/views/ConstructorLayout.vue:762-1212` + new components under `@/components/constructor/previews/`
- **Notes:** Extract Step1/Step7/Step8 previews, brief modal, transitions.

---

### F-08 — Split `constructor.ts` Pinia store (1035 lines)
- **Status:** TODO
- **Severity:** 🟡 Important
- **Phase:** 3
- **Model recommendation:** Opus 4.7
- **Target files:** `packages/constructor/src/stores/constructor.ts`
- **Plan outline:** `useBrandData`, `useCeoReview`, `useCeoReselectDraft`, `usePreviews`, `useEditSection` + facade adapter.
- **Notes:** Touches every step / Step10 / CEO flow. Opus + facade pattern to avoid breaking all consumers at once.

---

### F-09 — Split `packages/worker/src/routes/brands.ts` (1282 lines)
- **Status:** TODO
- **Severity:** 🟡 Important
- **Phase:** 3
- **Model recommendation:** Opus 4.7
- **Target files:** `packages/worker/src/routes/brands.ts`
- **Plan outline:** split into `brands.crud.ts`, `brands.status.ts`, `brands.ceo.ts`, `brands.notifications.ts`.

---

### F-10 — `slack.ts` (632 lines) declarative section-based renderer
- **Status:** TODO
- **Severity:** 🟡 Important
- **Phase:** 3
- **Model recommendation:** Opus 4.7
- **Target files:** `packages/worker/src/utils/slack.ts`
- **Notes:** Requires snapshot test of Slack output before/after.

---

### F-11 — Unify `po-edit/*` & `ceo-reselect/*` views + footer components
- **Status:** TODO
- **Severity:** 🟡 Important
- **Phase:** 3
- **Model recommendation:** Opus 4.7
- **Target files:** `packages/constructor/src/views/{ceo-reselect,po-edit}/*.vue`, `packages/constructor/src/components/constructor/{ceo-reselect,po-edit}/*Footer.vue`
- **Notes:** Touches CEO/PO flow. Opus only.

---

### F-12 — `store.saveBrand` and other manual `fetch()` calls bypass `useApi`
- **Status:** TODO
- **Severity:** 🟡 Important
- **Phase:** 2
- **Model recommendation:** Sonnet Thinking
- **Target files:**
  - `packages/constructor/src/stores/constructor.ts:866-944`
  - `packages/constructor/src/composables/useBrandPreviewLayers.ts:77-89`
  - `packages/constructor/src/views/steps/Step10ReviewSubmit.vue:287-303, 1281-1300`
- **Notes:** Step10 edits touched here — keep scope narrow (just `loadComponentSelectionDetails` extraction). Avoid bigger Step10 refactor.

---

### F-13 — Step10 re-fetches 4 lists already loaded by `ConstructorLayout`; no cache
- **Status:** TODO
- **Severity:** 🟡 Important
- **Phase:** 2
- **Model recommendation:** Sonnet Thinking
- **Target files:** `packages/constructor/src/views/steps/Step10ReviewSubmit.vue:185-218`, `packages/constructor/src/views/ConstructorLayout.vue:221-235, 478-509`, new `packages/constructor/src/composables/useLibraries.ts` or store.
- **Notes:** Likely candidate for a lightweight TTL cache composable. Mark `NEEDS_VERIFICATION` if timing isn't deterministic.

---

### F-14 — Debounce `saveDraftToStorage` (currently fires on every keystroke)
- **Status:** TODO
- **Severity:** 🟡 Important
- **Phase:** 1
- **Model recommendation:** Sonnet Thinking
- **Target files:** `packages/constructor/src/stores/constructor.ts:371`
- **Recommended change:** Use `useDebounceFn` (VueUse) or hand-rolled timer with 500 ms delay; force flush on `beforeunload`.
- **Verification:** type-check + dev-run typing into a textarea to see localStorage writes are throttled.

---

### F-15 — `BrandPreviewPanel.vue` has another `deep: true` watch
- **Status:** TODO
- **Severity:** 🟢 Recommendation
- **Phase:** 2
- **Model recommendation:** Sonnet Thinking
- **Target files:** `packages/constructor/src/components/constructor/BrandPreviewPanel.vue:17`
- **Notes:** Needs to read the file first to confirm shape of the watcher. Mark `NEEDS_VERIFICATION` if it’s tied to layout invariants.

---

### F-16 — `createBrandSchema` ≡ `updateBrandSchema`; `z.any()` for briefs
- **Status:** TODO
- **Severity:** 🟢 Recommendation
- **Phase:** 2
- **Model recommendation:** Sonnet Thinking
- **Target files:** `packages/worker/src/routes/brands.ts:44-94`, new `packages/shared/src/schemas/brand.ts`
- **Notes:** Avoid breaking the existing `BrandStepData` shape — keep schema permissive but typed.

---

### F-17 — `brands.delete('/:id')` not atomic
- **Status:** TODO
- **Severity:** 🟢 Recommendation
- **Phase:** 1
- **Model recommendation:** Sonnet Thinking
- **Target files:** `packages/worker/src/routes/brands.ts:1241-1280`
- **Recommended change:** Wrap the four sequential `prepare().run()` calls into a single `db.batch([...])`.
- **Verification:** worker `type-check` + `build`.

---

### F-18 — `brands.put('/:id')` 27-branch if-tree for partial update
- **Status:** TODO
- **Severity:** 🟢 Recommendation
- **Phase:** 2
- **Model recommendation:** Sonnet Thinking
- **Target files:** `packages/worker/src/routes/brands.ts:667-762`
- **Recommended change:** Declarative `UPDATABLE_FIELDS` array.

---

### F-19 — `brands.put('/:id')` blocks admin from editing others' brands (silent 404)
- **Status:** TODO / BLOCKED (needs product decision)
- **Severity:** 🟢 Recommendation
- **Phase:** 2
- **Model recommendation:** Sonnet Thinking (after product decision)
- **Target files:** `packages/worker/src/routes/brands.ts:659-665`
- **Notes:** Either allow admin via `canSeeAll` branch OR return explicit 403 with hint. Need product input.

---

### F-20 — Silent `catch {}` blocks across frontend
- **Status:** TODO
- **Severity:** 🟢 Recommendation
- **Phase:** 1
- **Model recommendation:** Sonnet Thinking
- **Target files:**
  - `packages/constructor/src/composables/useApi.ts:18`
  - `packages/constructor/src/stores/constructor.ts:335, 348, 367`
  - `packages/constructor/src/views/steps/Step10ReviewSubmit.vue:300, 1296`
  - `packages/constructor/src/composables/useBrandPreviewLayers.ts:85`
  - `packages/constructor/src/views/ConstructorLayout.vue:474`
- **Recommended change:** Add `packages/constructor/src/utils/log.ts` with `logSilent(scope, err)` (no-op in prod, `console.warn` in dev). Replace all silent catches.
- **Notes:** Two of the locations are inside `Step10ReviewSubmit.vue` — touch ONLY the `catch` blocks, do not refactor anything else.
