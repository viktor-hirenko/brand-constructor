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

- **Completed findings:** F-02 ✅, F-01 ✅, F-03 ✅, F-14 ✅, F-17 ✅, F-20 ✅
- **In progress:** —
- **Phase 1 COMPLETE — deploy when ready**
- **Next recommended finding (Phase 2):** F-12 — rewrite `saveBrand` network code to `apiGet/apiPut`
- **Recommended model for next step:** Sonnet Thinking (new chat, reference this tracker)
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
- **Status:** DONE
- **Date completed:** 2026-05-20
- **Severity:** 🔴 Critical
- **Phase:** 1 (low-risk security)
- **Model used:** Sonnet Thinking (Cursor Agent)
- **Files changed:**
  - `packages/worker/src/index.ts` — removed entire `GET /api/debug/pananames` handler (27 lines)
- **Summary of changes:** Deleted one-off debug route that was registered before `authMiddleware`. It leaked `signaturePreview` (first/last 8 chars of `PANANAMES_SIGNATURE`) and performed anonymous outbound calls to Pananames API. No other code referenced this endpoint (grep confirmed). Domain checks remain via `scheduled` → `batchCheckDomains` in `domain-check.ts`.
- **Verification commands run:**
  ```
  pnpm --filter @brand-constructor/worker build   # ✓ wrangler dry-run OK
  ```
- **Verification result:** Worker builds cleanly; endpoint removed from bundle.
- **Manual QA after deploy:** `GET /api/debug/pananames` → 404; `GET /api/health` → 200 unchanged.
- **Suggested commit message:**
  ```
  fix(worker,security): remove public /api/debug/pananames endpoint

  The debug handler was registered before authMiddleware and exposed
  signaturePreview plus live Pananames API calls to anonymous callers.
  One-off debug only; production domain checks use scheduled batchCheckDomains.

  Refs: docs/audits/enterprise-audit-brand-constructor.md F-01
  ```

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
- **Status:** DONE
- **Date completed:** 2026-05-20
- **Severity:** 🔴 Critical
- **Phase:** 1
- **Model used:** Sonnet Thinking (Cursor Agent)
- **Files changed:**
  - `packages/frontend/env.d.ts` — `RouteMeta.roles` augmentation
  - `packages/frontend/src/router/index.ts` — `meta.roles: [...ADMIN_ROLES]` on `/users` + guard in `beforeEach`
- **Summary of changes:** Minimal denylist per audit note: only `/users` is admin-only (`admin`, `head_dhc`). Library routes (`/concepts`, `/namings`, …) remain open to all authenticated roles (read-only for PO/designers per PRD). Direct navigation to `/users` as `product_owner` redirects to `/concepts` (sidebar already hid the link via `isAdmin`).
- **Verification:** `pnpm --filter @brand-constructor/frontend type-check` ✓
- **Manual QA after deploy:** Login as `strategy_identity` or `product_owner` → open `/users` in URL bar → lands on `/concepts`.
- **Suggested commit message:**
  ```
  fix(frontend,security): guard /users route with ADMIN_ROLES

  Admin SPA router only checked isAuthenticated; any role could mount
  UsersView (API returned 403 but UI leaked admin structure). Add
  meta.roles from shared ADMIN_ROLES and enforce in beforeEach.

  Refs: docs/audits/enterprise-audit-brand-constructor.md F-03
  ```

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
- **Status:** DONE
- **Date completed:** 2026-05-20
- **Severity:** 🟡 Important
- **Phase:** 1
- **Model used:** Sonnet Thinking (Cursor Agent)
- **Files changed:**
  - `packages/constructor/src/stores/constructor.ts` — inline `debounce<T>` helper (no new deps), 500 ms delay on `watch(stepData, …)`
- **Verification:** `pnpm --filter @brand-constructor/constructor type-check` ✓
- **Suggested commit message:**
  ```
  perf(constructor): debounce saveDraftToStorage 500 ms

  Deep watch on stepData triggered localStorage.setItem on every
  reactive mutation (keystrokes, slider moves). Added inline debounce
  helper — no new dependencies required.

  Refs: docs/audits/enterprise-audit-brand-constructor.md F-14
  ```

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
- **Status:** DONE
- **Date completed:** 2026-05-20
- **Severity:** 🟢 Recommendation
- **Phase:** 1
- **Model used:** Sonnet Thinking (Cursor Agent)
- **Files changed:**
  - `packages/worker/src/routes/brands.ts` — 4 sequential `.prepare().run()` → single `db.batch([...])`
- **Verification:** `pnpm --filter @brand-constructor/worker build` ✓ (dry-run OK)
- **Suggested commit message:**
  ```
  fix(worker): atomic brand delete via db.batch

  Four sequential UPDATE/DELETE calls could leave library items
  (concepts/namings) unlocked while the brand still exists if a
  later statement failed. Wrapped in single db.batch([...]).

  Refs: docs/audits/enterprise-audit-brand-constructor.md F-17
  ```

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
- **Status:** DONE
- **Date completed:** 2026-05-20
- **Severity:** 🟢 Recommendation
- **Phase:** 1
- **Model used:** Sonnet Thinking (Cursor Agent)
- **Files changed:**
  - `packages/constructor/src/utils/log.ts` — new `logSilent(scope, err)` helper
  - `packages/constructor/src/composables/useApi.ts` — import + `catch (err) { logSilent(...) }`
  - `packages/constructor/src/stores/constructor.ts` — 3 catches
  - `packages/constructor/src/composables/useBrandPreviewLayers.ts` — 1 catch
  - `packages/constructor/src/views/ConstructorLayout.vue` — 1 catch
  - `packages/constructor/src/views/steps/Step10ReviewSubmit.vue` — 3 catches (only catch blocks, no other refactoring)
- **Verification:** `pnpm --filter @brand-constructor/constructor type-check` ✓
- **Suggested commit message:**
  ```
  fix(constructor): replace silent catch{} with logSilent helper

  Empty catch blocks swallowed errors silently in production.
  logSilent() emits console.warn in DEV (tree-shaken in prod build).

  Refs: docs/audits/enterprise-audit-brand-constructor.md F-20
  ```
