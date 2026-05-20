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

- **Completed findings:** F-02 ✅, F-01 ✅, F-03 ✅, F-14 ✅, F-17 ✅, F-20 ✅, F-12 ✅, F-13 ✅, F-15 ✅, F-16 ✅, F-18 ✅, F-19 ✅, F-06 ✅, F-22 ✅, F-21 ✅, F-07 ✅, F-11 ✅, F-10 ✅, F-09 ✅, F-08 ✅, F-04 ✅
- **In progress:** —
- **Phase 1 COMPLETE ✅ — deployed to prod 2026-05-20**
- **Phase 2 COMPLETE ✅ — deployed to prod 2026-05-20**
- **F-06 COMPLETE ✅ (Phase 3, first finding) — smoke passed 2026-05-20**
- **F-22 + F-21 COMPLETE ✅ — local commits, awaiting deploy**
- **F-07 COMPLETE ✅ — local commit, awaiting deploy (constructor pages only)**
- **F-11 COMPLETE ✅ — local commit, awaiting deploy (constructor pages only)**
- **F-10 COMPLETE ✅ — local commit, awaiting deploy (worker only)**
- **F-09 COMPLETE ✅ — local commit, awaiting deploy (worker only)**
- **F-08 COMPLETE ✅ — local commit, awaiting deploy (constructor pages only)**
- **F-04 COMPLETE ✅ — local commit, awaiting deploy (worker only)**
- **Next:** Phase 3 — только Opus 4.7, только по явному запросу. F-05 — last remaining Phase 3 finding.
- **Recommended model for Phase 3:** Opus 4.7, один finding за чат
- **Last update:** 2026-05-21

### Open follow-ups noted during prior findings

- _(F-02 scope extension, optional)_: `packages/constructor/src/stores/auth.ts:92`, `packages/frontend/src/stores/auth.ts:85`, `packages/frontend/src/App.vue:23`, `packages/frontend/src/components/ui/AppSidebar.vue:21` still use the runtime `VITE_ENVIRONMENT` flag. They are **fail-closed** (no security regression from env typo), so they were intentionally left out of F-02. Worth normalising in a future cleanup pass.
- _(F-21, new)_: server-side status freeze on `PUT /api/brands/:id` is missing — see finding below.
- _(F-22, new)_: `rejected` brand status is unused in the entire UI / product flow — leftover from v1 PRD; cleanup tracked as a separate finding to coordinate worker + shared types + admin filter + constructor maps.
- _(F-07, new)_: `LayoutBriefModal.vue` (extracted in F-07) is wired but currently unreachable — no UI surface in `packages/constructor` calls `openLayoutBrief()`. The underlying brief data (`store.stepData.{concept,externalNaming,internalNaming}.new*Brief*`) is still populated by `NewConceptModal.vue` / `NewNamingModal.vue` / `NewInternalNamingModal.vue`, so the data path is alive. Two options for a future cleanup: (a) re-wire a "Переглянути бриф" button on Step 2/3/4 right-panel previews to surface the brief; (b) delete the modal + brief computeds entirely if product confirms the preview is no longer required. Decision deferred — not blocking. Same applies to dead helpers `getExternalDomain`/`getExternalPrice` that were removed inline during F-07 (no other callers found in the repo).

### Phase plan

**Phase 1 — Low-risk security & quick wins (Sonnet Thinking):**
F-02 → F-01 → F-03 → F-14 → F-17 → F-20

**Phase 2 — Medium structural cleanup (Sonnet Thinking, can be batched per chat):**
F-12 → F-13 → F-15 → F-16 → F-18 → F-19

**Phase 3 — Large structural refactors (Opus 4.7, one finding per chat, do NOT start without explicit user instruction):**
F-06 (split into 3 PRs) → F-07 → F-11 → F-10 → F-09 → F-08 → F-04 → F-05 (F-04 and F-05 remaining)

**Newly discovered (post-Phase-2):**
F-21 — server-side status freeze on `PUT /api/brands/:id`. Severity 🟡, Sonnet Thinking sized.
F-22 — remove unused `rejected` brand status from the entire stack. Severity 🟢, Sonnet Thinking sized.

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
  - `packages/constructor/src/router/index.ts`
  - `packages/frontend/src/router/index.ts`
- **Summary of changes:** Заменён runtime флаг на compile-time константу Vite. Typo в `.env.production` больше не может отключить RBAC.
- **Verification:** type-check ✓ (оба пакета), build ✓
- **Suggested commit message:**
  ```
  fix(router,security): drop runtime VITE_ENVIRONMENT bypass, use import.meta.env.DEV

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
- **Verification:** `pnpm --filter @brand-constructor/frontend type-check` ✓
- **Manual QA after deploy:** Login as `strategy_identity` or `product_owner` → open `/users` in URL bar → lands on `/concepts`.
- **Suggested commit message:**
  ```
  fix(frontend,security): guard /users route with ADMIN_ROLES

  Refs: docs/audits/enterprise-audit-brand-constructor.md F-03
  ```

---

### F-04 — Non-atomic approve flow in `PATCH /:id/status`
- **Status:** DONE
- **Date completed:** 2026-05-21
- **Severity:** 🔴 Critical
- **Phase:** 3 (promoted from S-sized due to fragility of CEO/approve flow)
- **Model used:** Opus 4.7
- **Target files:** `packages/worker/src/routes/brands.status.ts` (single PATCH `/:id/status` handler — was moved verbatim from the legacy `brands.ts:911-1239` zone during F-09; F-04 is the first behavioral change to this zone since the F-09 refactor).
- **Problem:** Brand status flipped to `approved` in a standalone `UPDATE` (formerly line 107-109 of `brands.status.ts`); library marking (`concepts`/`external_namings`/`internal_namings`/`pr_packages` → `status='used'`) happened in a separate `db.batch(...)` later in the same handler. Between the two writes there was a window: if the marks batch failed (transient D1 error, network blip), the brand was already persisted as `approved` but the library elements remained `available` — the same library item could be picked again for another brand (race).
- **Files changed:**
  - `packages/worker/src/routes/brands.status.ts` — folded the standalone first `UPDATE brands SET status='approved', updated_at=?, [ceo_comments=?, ceo_selections=?]` into the same `db.batch([...])` as the library marks. For the `approved` branch, the first standalone `UPDATE` is **skipped** (early `if (targetStatus !== 'approved')` guard). All brand columns that the approve flow writes (status, updated_at, optional ceo_comments, optional ceo_selections, optional concept_id / external_naming_ids / internal_naming_id from CEO overrides) are now collected into a single `UPDATE brands SET ... WHERE id = ?` statement that is pushed **first** into `batchStatements`, alongside the library marks. The batch is then executed via `await c.env.DB.batch(batchStatements)`. D1 batch is all-or-nothing, so on failure the brand stays in its current status (`submitted` or `needs_revision`) and library elements remain `available`.
- **Source of `ceoSel`:** previously the handler did a second `SELECT * FROM brands WHERE id = ?` after the first UPDATE specifically to read the freshly-written `ceo_selections` JSON. After F-04 that second SELECT is no longer needed — the handler uses `body.ceoSelections ?? JSON.parse(existing.ceo_selections || '{}')` (where `existing` is the pre-batch row already loaded at the top of the handler). Semantically identical: `body` wins when sent in the PATCH, otherwise the previously-persisted value from PATCH `/:id/ceo-selections` is used.
- **Slack dispatch ordering:** the 4 approve channels (`buildStrategyMessage` / `buildPrMarketingMessage` / `buildProductDesignMessage` / `buildApprovedWorkflowMessage` × `sendSlackMessage`, wrapped in `Promise.allSettled` via `c.executionCtx.waitUntil`) are now enqueued **only after** `await c.env.DB.batch(...)` returns successfully. If the batch throws, the handler short-circuits with `500 { success: false, error: 'Failed to approve brand: atomic database update failed. No changes were applied.' }` before reaching the Slack dispatch site — so no notifications fire for a brand that never actually became approved.
- **Refresh-after-batch:** the Slack-prep path loads a fresh `BrandRow` after the batch (so `collectBrandNotificationData` sees post-batch values of `ceo_comments` etc.) and forwards it together with the `effectiveCeoSel` override. The `collectBrandNotificationData` contract is unchanged — `brands.notifications.ts` was not touched.
- **Error handling:**
  - Batch failure → wrapped in a single `try { await c.env.DB.batch(...) } catch { console.error('Approve atomic batch failed:', err); return c.json({ success: false, error: '…' }, 500) }`. This is the only new explicit error response in the file. The 4 pre-existing return shapes (400 validation, 400 invalid transition, 403 ownership, 403 RBAC, 404 not found) are unchanged.
  - Slack failure → kept in the existing `try { … } catch (err) { console.error('Slack notification error (approved):', err) }`. Slack failures never fail the HTTP response (intentional — D1 already committed, the contract with the client is fulfilled).
  - Non-approved branches (draft→submitted, needs_revision→submitted, submitted→needs_revision) → behavior unchanged, including the submitted/needs_revision Slack flow.
- **What was NOT touched:** `utils/brands.ts`, `utils/slack.ts`, `routes/brands.notifications.ts`, `routes/brands.ts` (the F-09 shell), every other route in `packages/worker/src/routes/`, and the entire frontend / constructor side. Public response contract `{ success: true, data: Brand }` is preserved byte-for-byte for the happy path. The unhappy path now returns a clean 500 with a descriptive message instead of an unhandled exception bubbling up to Hono's default handler (which would have produced a generic 500 with no JSON body).
- **One inert local dropped:** the `componentSelections` JSON parse that lived inside the legacy approve branch (kept verbatim by F-09 to match pre-refactor byte-for-byte) was unused — `componentSelections` was never read from. Removed during F-04 as it lives inside the rewritten approve branch.
- **Verification:**
  - `pnpm --filter @brand-constructor/worker type-check` ✓ (0 errors)
  - `pnpm --filter @brand-constructor/worker build` ✓ (wrangler dry-run, 335.73 KiB / 63.76 KiB gzipped — matches F-09 parity within rounding)
  - `ReadLints` on `routes/brands.status.ts` → 0 issues
- **Manual QA after deploy:** see deploy section at the end of the document — full PO + CEO end-to-end flow on a fresh test brand (create draft → wizard → submit → CEO sees in `bc-approvals` → CEO approve → brand row shows `status=approved` AND all 4 command channels receive the message).
- **Suggested commit message:**
  ```
  fix(worker): F-04 — atomic approve flow via single db.batch + post-success Slack

  PATCH /api/brands/:id/status approve branch used to flip the brand to
  'approved' in a standalone UPDATE and then mark library elements
  (concepts/external_namings/internal_namings/pr_packages → status='used')
  in a separate db.batch. If the marks batch failed mid-flight, the brand
  was already 'approved' but library elements remained 'available' — the
  same item could be picked again for another brand (race).

  Approve now folds the brand status flip + optional CEO override columns
  (concept_id / external_naming_ids / internal_naming_id) + all library
  marks into a single db.batch. D1 batch is all-or-nothing: on failure the
  brand stays in its previous status and library elements remain
  available. Slack dispatch (4 channels via waitUntil(Promise.allSettled))
  is enqueued ONLY after the batch successfully commits.

  Non-approved branches (draft→submitted, needs_revision→submitted,
  submitted→needs_revision) keep the standalone UPDATE — no library marks
  are involved in those transitions.

  Refs: docs/audits/enterprise-audit-brand-constructor.md F-04
  ```

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

### F-06 — `Step10ReviewSubmit.vue` decomposition (2431 lines)
- **Status:** DONE
- **Date completed:** 2026-05-20
- **Severity:** 🟡 Important
- **Phase:** 3 (split into 3 PRs)
- **Model used:** Opus 4.7
- **Target files:** `packages/constructor/src/views/steps/Step10ReviewSubmit.vue`
- **Notes:** Touched all five active review modes (CEO finalize, PO draft, PO submitted, PO returned-from-CEO, approved read-only). The legacy "default" `v-else` view that only rendered on `status === 'rejected'` was removed in PR #1 — that flow was inherited from the original v1 PRD (when CEO had an explicit "Reject" action) and is no longer reachable from the current UI / Figma. The `rejected` status itself is **not** handled by the constructor anymore (no defensive fallback) since the product confirmed it never occurs in the current flow; systematic removal of `rejected` from the worker / shared types / admin filter is tracked as F-22.
- **PR plan:**
  - **PR #1 — DONE** (commit `ae82204`): removed the legacy `ReviewLegacyView` branch entirely, dropped all CEO/PO computeds and scroll save/restore mechanisms used only by the legacy view, extracted the `componentSelectionDetails` loader into `composables/useReviewComponentSelections.ts` (still needed by the unified view's Visual Components summary and by the PDF generator). Step10ReviewSubmit.vue: 2431 → 1345 lines.
  - **PR #2 — DONE** (commit `af4771d`): extracted unified review template into `components/constructor/review/ReviewUnifiedView.vue` together with its layout-specific computeds (`reviewHeaderInfoOverride`, `unifiedReviewTitle/Subtitle`, `isPoEditable`, `externalNamingItems`, `deliverablesScope/TimingText`, `visualComponentsSummary`, `brandHeaderTitle`, `getPoCommentForSection`, `poDraftInfoOverride`, `sectionWord`, local `formatDate`). Parent computes one new `sectionApplyFlags` aggregate for the child and forwards user actions through high-level emits (`status-change`, `back`, `share`, `pdf`, `edit-section`, `start-ceo-reselect`, `apply-ceo-variant`, `open-concept-preview`, `open-pr-package-preview`, `update:ceo-comment`, `general-ceo-comment-update`, `resolve-ceo-comment`, `unresolve-ceo-comment`). Step10ReviewSubmit.vue: 1345 → 853 lines.
  - **PR #3 — DONE** (commit `a1968dc`): extracted orchestration composables into `composables/useCeoApplyVariants.ts` (312 lines — CEO selection helpers, applied-state computeds, attention counter, `sectionApplyFlags`, CEO display projections, dependency-guard modals + apply-variant handlers) and `composables/useCeoReviewComments.ts` (220 lines — `ceoComments` reactive mirror + `watch` sync, `revisionMissingSections` / `revisionRequiresAnyComment` UI gates, `revisionWarning`, `validateNeedsRevision`, all 4 comment mutation handlers + 4 inline read helpers). Parent now does explicit two-way wiring: `useCeoApplyVariants` constructed first, then `useCeoReviewComments` receives `apply.isCeoChoiceAnAlternative` as an opts callback (no nested composable instantiation, fully unit-testable). Step10ReviewSubmit.vue: 853 → **489 lines** (under 500-line target).
- **PR #3 housekeeping (PR-2 leftover):** removed ~36 lines of dead code that became unreachable after PR #2 extracted the template into `ReviewUnifiedView`: `basics`, `mode`, `deliverables`, `visualComponents`, `componentSelectionCount` (duplicated inside the child), `showPoSubmitButton` (child has its own submit-visibility logic), `draftSaved` + `handleSaveDraft` (no `@save-draft` listener in template or child emits), `goToStep` (only used by the legacy view removed in PR #1). These were stylistically in-scope for "финальная декомпозиция" and were necessary to hit the ≤500 target.
- **Naming decision:** new files drop the `Step10` prefix since the wizard step numbering is already inconsistent (Step2 and Step6 deleted historically) and the review screen is logically a separate shell, not a numbered wizard step. Route file `Step10ReviewSubmit.vue` itself stays renamed-as-is to keep routing untouched (possible follow-up rename outside F-06 scope).
- **Rejected status decision (PR #1):** confirmed by full repo scan + product review — no UI in `packages/constructor` or `packages/frontend` ever calls `PATCH /api/brands/:id/status` with `'rejected'`; `handleStatusChange` is typed `'submitted' | 'approved' | 'needs_revision'`; `BrandsView` in admin SPA only has a filter tab "Rejected" for displaying existing records, not a "Reject" action. v1 PRD had `pending_cpo + pending_ceo + rejected`; current schema upgraded to `submitted + needs_revision + approved`, leaving `rejected` as an unused enum tail. Worker API still accepts `submitted → rejected` for backward compat — leaving that path open is harmless (no client calls it) and an explicit removal is tracked separately as F-22.
- **Scroll behaviour decision (PR #1):** the legacy view kept header/footer fixed via `Step10ReviewScrollLayout`; the new unified view scrolls everything together by design (small viewport, fixed chrome would leave too little content space). With the legacy view gone, the entire scroll save/restore mechanism (`REVIEW_SCROLL_KEY`, `saveReviewScroll`, `restoreReviewScroll`, `getScrollContainer`) is dead — removed. `store.step10ScrollTop` / `setStep10ScrollTop` becomes unused store state, eligible for cleanup under F-08 (Pinia split).
- **Final file inventory:**
  - `packages/constructor/src/views/steps/Step10ReviewSubmit.vue` — 489 lines (parent: role/mode flags, selected-items resolvers, composable wiring, status/save state, navigation handlers, `handleStatusChange`, `handlePrintBrand`, template).
  - `packages/constructor/src/components/constructor/review/ReviewUnifiedView.vue` — 726 lines (unified template + layout-specific computeds).
  - `packages/constructor/src/composables/useCeoApplyVariants.ts` — 312 lines (apply-flow state machine).
  - `packages/constructor/src/composables/useCeoReviewComments.ts` — 220 lines (CEO comments + revision validation).
  - `packages/constructor/src/composables/useReviewComponentSelections.ts` — 57 lines (already extracted in PR #1).
- **Verification:** `pnpm --filter @brand-constructor/constructor type-check` ✓, `pnpm --filter @brand-constructor/constructor build` ✓ (one pre-existing chunk-size warning on `pdfmake` / `vfs_fonts`, unrelated).
- **Manual QA after deploy:** smoke all 5 review modes — CEO finalize on `submitted`, CEO frozen on `needs_revision`, PO draft, PO submitted, PO returned-from-CEO (apply CEO concept, then external, attention counter goes to 0, submit unblocks), approved read-only. Also exercise the two dependency-guard modals: (a) PO clicks "Apply CEO" on external naming while concept is still in CEO override → modal 1985:4362 → "Застосувати все" applies both; (b) PO clicks "Редагувати" on external naming with concept mismatch → modal 1985:4657 → "Редагувати концепт" navigates to `/po-edit/concept`.
- **Suggested commit message (PR #3):**
  ```
  refactor(constructor): F-06 PR 3/3 — extract CEO review composables

  Refs: docs/audits/enterprise-audit-brand-constructor.md F-06
  ```

---

### F-07 — `ConstructorLayout.vue` (1312 lines): extract right-panel previews
- **Status:** DONE
- **Date completed:** 2026-05-21
- **Severity:** 🟡 Important
- **Phase:** 3
- **Model used:** Opus 4.7
- **Target files:** `packages/constructor/src/views/ConstructorLayout.vue` (was 1312 lines after F-06, originally cited as 1345)
- **Files changed:**
  - `packages/constructor/src/views/ConstructorLayout.vue` — 1312 → **624 lines** (under the ≤700 target). Dropped imports for `getAssetUrl`, `ConceptPreviewPopup`, `PrPackagePreviewPopup`. Dropped dead helpers `getExternalDomain`/`getExternalPrice` (no callers anywhere in repo). Removed brief computeds + helpers (`conceptBriefItems`, `externalBriefItems`, `internalBriefItems`, `getLayoutBriefTitle`, `activeBriefItems`, `formatBool`, `fallbackValue`, `formatBudget`, `openLayoutBrief`, `closeLayoutBrief`, `LayoutBriefKind` type alias), `hasGeo`/`hasDate`/`hasLinkedProduct` (moved into child), `formatDate` (moved into both children). Removed the `<style scoped>` block (transitions moved with the overlays). Replaced 460 lines of step-1/2/3/4/7/8 right-panel markup with a single `<StepPreviewRightPanel ... />` invocation; replaced the two preview-transition blocks with `<LayoutPreviewOverlays />`; replaced the brief Teleport with `<LayoutBriefModal v-model:kind="activeBrief" :current-step="currentStep" />`.
  - `packages/constructor/src/components/constructor/layout/StepPreviewRightPanel.vue` — **new, 511 lines**. Owns the entire `w-[58%]` right column for steps 1/2/3/4/7/8 + generic placeholder. Receives `currentStep`, `brandBasics`, `conceptPreviewForSlider`, `isConceptSliderFinalSelected`, `selectedConcept`, `selectedExternalNamings`, `selectedInternalNaming`, `step9SelectedLayers`, `step10SelectedLayers`, `hasStep9Selections`, `hasSidebarSelected`, `step9SidebarVisible`, `delegateToDesigners`, `hasExternalNamingBrief`, `internalNamingFeedback` as typed props. Emits `confirm-concept` (Step 2 slider), `toggle-sidebar` (Step 7), `open-concept-details` (Step 8). Owns a local `formatDate(launchDate)` helper.
  - `packages/constructor/src/components/constructor/layout/LayoutPreviewOverlays.vue` — **new, 72 lines**. Self-contained — reads `useConstructorStore()` + `useLibrariesStore()` directly to resolve the overlay concept; renders both concept-preview and PR-package-preview backdrop+drawer `<Transition>` pairs. Carries the `.concept-backdrop-*` / `.concept-panel-*` scoped styles that used to live in `ConstructorLayout.vue`.
  - `packages/constructor/src/components/constructor/layout/LayoutBriefModal.vue` — **new, 188 lines**. Self-contained "smart" Teleport modal. Owns all brief computeds + helpers (`conceptBriefItems`, `externalBriefItems`, `internalBriefItems`, `formatBool`, `fallbackValue`, `formatBudget`, `formatDate`, `briefTitle`, `briefItems`). Two-way bound via `v-model:kind` (emits `update:kind` with `null` to close). "Редагувати" calls `store.setReturnToStep(currentStep)` + `router.push` internally then closes.
- **Decomposition strategy:** keep all mode-routing logic in parent (it is the contract with the router and would only fragment if extracted to a composable on its own); keep PO-edit / CEO-reselect inline right-panel branches in parent (they are short and tightly coupled to state that the parent already owns for the StepPreviewRightPanel props — extracting them into separate shells is exactly the scope of F-11); extract Step1/Step7/Step8 previews + transitions + brief modal as F-07 specifies.
- **Dead-code note (during F-07):** `openLayoutBrief()` is unreachable from any UI in the repo — the modal is wired but never triggered. Kept as a working component (data path is alive: store is populated by `NewConceptModal`/`NewNamingModal`/`NewInternalNamingModal`), pending a product decision to either re-wire a "Переглянути бриф" button on Step 2/3/4 right-panel previews or delete the modal entirely. Logged as an open follow-up above. The two dead `getExternalDomain` / `getExternalPrice` helpers (12 LoC, zero callers across the repo) were removed inline since their data already comes from `selectedExternalNamings.map(n => n.name).join(', ')` in the Step 8 summary card.
- **Verification:** `pnpm --filter @brand-constructor/constructor type-check` ✓, `pnpm --filter @brand-constructor/constructor build` ✓ (same pre-existing chunk-size warning on `pdfmake` / `vfs_fonts` that was already documented in F-06).
- **Manual QA after deploy:** smoke each wizard step's right panel — Step 1 (basics cards or empty state), Step 2 (concept slider with `Confirm`), Steps 3 & 4 (mobile concept preview), Step 7 (iPhone with layered visual components + sidebar toggle button reveals/hides when a `ct_sidebar*` selection is added), Step 8 (brand summary card with `Переглянути деталі` + scaled iPhone preview). Also exercise the two overlays from any step: open a concept preview from `ConceptGrid` → backdrop slides + popup appears; open a PR package preview → same behaviour with `PrPackagePreviewPopup`. Inline CEO-reselect and PO-edit right panels (`ConceptPreviewSlider` + `ConceptMobilePreview`) and the review-shell `BrandPreviewPanel` were not touched by F-07 — quick sanity smoke is enough.
- **Suggested commit message:**
  ```
  refactor(constructor): F-07 — extract right-panel previews from ConstructorLayout

  ConstructorLayout.vue: 1312 → 624 lines (target ≤700).

  New components in components/constructor/layout/:
  - StepPreviewRightPanel.vue (511) — Step 1/2/3/4/7/8 right-column previews
  - LayoutPreviewOverlays.vue (72) — concept + PR package preview transitions
  - LayoutBriefModal.vue (188) — wizard brief modal (Teleport)

  Refs: docs/audits/enterprise-audit-brand-constructor.md F-07
  ```

---

### F-08 — Split `constructor.ts` Pinia store (1036 lines)
- **Status:** DONE
- **Date completed:** 2026-05-21
- **Severity:** 🟡 Important
- **Phase:** 3
- **Model used:** Opus 4.7
- **Target files:** `packages/constructor/src/stores/constructor.ts` (1036 → deleted)
- **Architecture:** Replaced the single 1036-line Pinia setup-store with a thin **facade composing five domain-specific composables**. The composables are plain Vue composables (not separate Pinia stores) — they are called from inside `defineStore('brand-constructor', ...)` so all refs they create are wrapped in the same Pinia reactive context and the singleton store identity is preserved. The public surface of `useConstructorStore` is preserved byte-for-byte; **all 29 consumer files were left untouched**.
- **Files added (new directory `packages/constructor/src/stores/constructor/`):**
  - `index.ts` (121 lines) — Pinia setup-store facade. Composes the five composables in dependency order, owns the two cross-slice orchestrators `loadBrand()` (delegates to per-slice loaders) and `reset()` (delegates to per-slice `resetSlice`), re-exports `CEO_RESELECT_EXTERNAL_NAMING_LIMIT` + types `CeoReselectSection` / `CeoReselectDraft` so the named-export contract from `@/stores/constructor` is preserved.
  - `useBrandData.ts` (528 lines) — wizard state (Step 1–8 `stepData`, `currentStep`, `isDraft`, `isLoading`, `isSaving`, `returnToStep`, `step3PreviewSlideIndex`, `_componentConflicts`), brand metadata (`brandId`, `brandStatus`, `brandInternalName`, `successType`, `saveError`), step navigation (`goToStep`/`nextStep`/`prevStep`), `validateStep` + `isCurrentStepValid` + `shouldSkipStep3`, all step `set*`/`toggle*` mutators (17 of them), `setComponentConflicts`, draft localStorage (`saveDraftToStorage` debounced, `restoreDraftFromStorage`, `clearDraftFromStorage`) with the debounced `watch(stepData, …, { deep: true })`, and `saveBrand()` (POST first, PUT thereafter; captures the new id and clears the draft after the first POST).
  - `useCeoReview.ts` (321 lines) — `brandCeoComments` / `brandCeoSelections` + all related error/loading refs (`saveCeoSelectionsError`, `saveCeoCommentResolvedError`, `saveCeoCommentResolvedLoading`, `isApplyingCeoVariant`, `applyCeoVariantError`), `setCeoCommentValue` (local optimistic edit with `resolved` invalidation on text change), `setCeoCommentResolved` (optimistic `PATCH /:id/ceo-comments/resolve` with rollback) + `isCeoCommentResolveLoading`, `setCeoSelectionValue`, `applyCeoVariant` (single section), `applyCeoConceptAndExternal` (atomic concept+external), `saveCeoSelections` (`PATCH /:id/ceo-selections` with partial merge). Receives `stepData`, `brandId`, `saveBrand` via opts.
  - `useCeoReselectDraft.ts` (156 lines) — transient `ceoReselectDraft` for `/ceo-reselect/*` routes + 8 setter/seeder functions (`resetCeoReselectDraft`, `setCeoReselectConcept`, `setCeoReselectConceptPreview`, `toggleCeoReselectExternalNaming`, `setCeoReselectExternalNamingIds`, `setCeoReselectInternalNaming`, `seedCeoReselectFromBrand`, `seedCeoReselectExternalNamingChained`). Exports `CEO_RESELECT_EXTERNAL_NAMING_LIMIT`, type `CeoReselectSection`, interface `CeoReselectDraft` (re-exported by `index.ts`). Receives `stepData`, `brandCeoSelections` via opts.
  - `usePreviews.ts` (79 lines) — `conceptPreviewOpen` / `conceptPreviewConceptId` (full-screen carousel overlay) + `prPackagePreviewOpen` / `prPackagePreviewPackage` (right-side drawer) + 4 open/close handlers. Receives `step3PreviewSlideIndex` ref via opts (only because `openConceptPreview` resets the slider index).
  - `useEditSection.ts` (139 lines) — `editingSection` + `editingSectionSnapshot` + `beginEditSection` (deep snapshot via `JSON.parse(JSON.stringify(...))`) / `commitEditSection` / `cancelEditSection`. Holds the now-private `getSectionStateByKey` / `restoreSectionStateByKey` switch-table helpers — they were used only by the edit-section flow in the legacy file. Receives `stepData`, `returnToStep` via opts.
  - `selectionHelpers.ts` (21 lines) — pure utility module exporting `readSelectionAsString` / `readSelectionAsArray` (CEO selection normalisation `string | string[] → string | null` / `string[]`). Shared by `useCeoReview` (apply variants) and `useCeoReselectDraft` (seed-from-brand). Zero runtime deps.
- **Files modified:** none of the 29 consumer files were touched — the facade preserves the public API one-for-one.
- **Files removed:** `packages/constructor/src/stores/constructor.ts` (1036 → deleted; replaced by the directory `stores/constructor/`).
- **Dead-code drop:** removed `step10ScrollTop` + `setStep10ScrollTop`. These were flagged in F-06 PR #1 notes as "eligible for cleanup under F-08" — the entire scroll save/restore mechanism (`REVIEW_SCROLL_KEY`, `saveReviewScroll`, `restoreReviewScroll`, `getScrollContainer`) was removed when PR #1 deleted the legacy `ReviewLegacyView` branch; the store-side ref and setter became unreachable. Repo-wide grep confirmed zero external consumers before removal.
- **Cross-slice wiring:** explicit `opts` parameters (refs + callbacks) — no module-level import cycles between slices. Construction order in the facade matches the dependency DAG: `useBrandData` → `useCeoReview` (needs stepData, brandId, saveBrand) → `useCeoReselectDraft` (needs stepData, brandCeoSelections) → `usePreviews` (needs step3PreviewSlideIndex) → `useEditSection` (needs stepData, returnToStep). Each composable additionally exports a `resetSlice` method and (for the two stateful slices that participate in `loadBrand`) a `load*` method that the facade destructures out of the spread before re-exposing the rest of the public surface.
- **Reactivity preserved:** refs created inside a composable that is itself called from inside `defineStore(setup)` are correctly registered as Pinia store state (documented "composing setup stores" pattern). No `markRaw` / `shallowRef` wrapping needed. The debounced `watch(stepData, ..., { deep: true })` for draft persistence stays inside `useBrandData` where `stepData` is created, so the watcher's lifetime is tied to the store singleton exactly as before.
- **Public API preservation verified by grep:** every store property exported in the legacy `return { ... }` block (lines 947–1035) appears in the new facade return (via spread from one of the five composables) **except** the two dead `step10ScrollTop` / `setStep10ScrollTop` entries that were dropped on purpose.
- **Verification:**
  - `pnpm --filter @brand-constructor/constructor type-check` ✓ (0 errors)
  - `pnpm --filter @brand-constructor/constructor build` ✓ (same pre-existing chunk-size warning on `pdfmake` / `vfs_fonts` that was already documented in F-06/F-07/F-11; `ConstructorLayout` and `Step10ReviewSubmit` chunks rebuilt with no size regression)
  - `pnpm --filter @brand-constructor/worker type-check` ✓
  - `pnpm --filter @brand-constructor/frontend type-check` ✓
  - Linter: `ReadLints` on the entire new `stores/constructor/` directory → 0 issues
  - The repo's `npm run lint` script invokes a globally-named `eslint` that is not installed in `node_modules/.bin` — same situation as F-09 / F-11, where `ReadLints` was the linter source of truth.
- **Manual QA after deploy:** full PO + CEO end-to-end on a fresh test brand — see deploy section below.
- **Suggested commit message:**
  ```
  refactor(constructor): F-08 — split constructor.ts Pinia store (1036 lines) into modular composables + facade

  The single 1036-line Pinia setup-store is now a thin facade composing
  five domain-specific composables under stores/constructor/:
    - useBrandData         — wizard state (Step 1–8), meta, validation,
                             navigation, draft localStorage, saveBrand()
    - useCeoReview         — CEO comments + selections + apply variants
    - useCeoReselectDraft  — transient draft for /ceo-reselect/* routes
    - usePreviews          — concept overlay + PR package drawer
    - useEditSection       — PO inline section-edit from Step 10
    - selectionHelpers     — pure string|string[] normalisation utils

  Cross-slice dependencies wired via explicit opts (refs + callbacks);
  no import cycles. The facade owns loadBrand() and reset() orchestrators
  that delegate to per-slice load* / resetSlice methods.

  Public API of useConstructorStore preserved byte-for-byte — all 29
  consumer files were left untouched. Re-exports CEO_RESELECT_EXTERNAL_-
  NAMING_LIMIT + types CeoReselectSection / CeoReselectDraft from
  index.ts so the named-export contract from '@/stores/constructor'
  is preserved.

  Dead-code drop: step10ScrollTop + setStep10ScrollTop (flagged in F-06
  PR #1 as "eligible for cleanup under F-08" — the scroll save/restore
  mechanism was removed when PR #1 deleted ReviewLegacyView).

  Refs: docs/audits/enterprise-audit-brand-constructor.md F-08
  ```

---

### F-09 — Split `packages/worker/src/routes/brands.ts` (1203 lines)
- **Status:** DONE
- **Date completed:** 2026-05-21
- **Severity:** 🟡 Important
- **Phase:** 3
- **Model used:** Opus 4.7
- **Target files:** `packages/worker/src/routes/brands.ts` (1203 → 27 lines, thin shell)
- **Architecture:** The single 1203-line monolith is now a thin Hono shell that mounts three role-aligned sub-routers via `brands.route('/', subRouter)`. Pure utilities (helpers, types, zod schemas, constants) live in `utils/brands.ts`; the Slack notification-payload assembler is its own tiny module next to the only handler that calls it. Public surface (`export default brands` consumed by `index.ts` at `/api/brands`) is byte-for-byte preserved.
- **Files added:**
  - `packages/worker/src/utils/brands.ts` (268 lines) — pure module, no Hono / no D1. Exports `BrandRow`, `rowToBrand`, `firstId`, `asIdArray`, `applyFieldTransform`, `parseCeoCommentsFromRow`, `flattenCeoCommentsToValues`, `normaliseCeoCommentsForStorage`, types `FieldTransform` / `UpdatableField` / `UpdateBrandBody`, constants `STATUS_TRANSITIONS` / `RESOLVABLE_SECTION_KEYS` / `UPDATABLE_FIELDS`, and zod schemas `updateStatusSchema` / `patchCeoSelectionsSchema` / `patchCeoCommentResolveSchema`.
  - `packages/worker/src/routes/brands.notifications.ts` (184 lines) — `collectBrandNotificationData()` only. Imports helpers from `utils/brands.ts` and Slack types from `utils/slack.ts`. Used twice by `brands.status.ts` (submitted/needs_revision branch + approved branch).
  - `packages/worker/src/routes/brands.crud.ts` (310 lines) — Hono sub-router. `GET /` (list with RBAC + pagination), `GET /:id`, `POST /` (create draft), `PUT /:id` (wizard update — F-18 UPDATABLE_FIELDS + F-21 409-guard), `DELETE /:id` (F-17 atomic batch).
  - `packages/worker/src/routes/brands.ceo.ts` (147 lines) — Hono sub-router. `PATCH /:id/ceo-selections`, `PATCH /:id/ceo-comments/resolve`.
  - `packages/worker/src/routes/brands.status.ts` (362 lines) — Hono sub-router with the single `PATCH /:id/status` handler. **F-04 zone preserved verbatim**: status-transition guard, role guards, conditional `ceo_comments` / `ceo_selections` reset on resubmit, submitted/needs_revision Slack-dispatch block (with new-briefs-vs-not branching), and the entire approve-batch (ceoSel parse → finalConceptId/ExtIds/IntId → batchStatements builder → `DB.batch(...)` → 4 Slack `Promise.allSettled` messages). The only changes are imports — no expression in the handler body was edited.
- **Files modified:** `packages/worker/src/routes/brands.ts` (1203 → 27 lines) — now imports the three sub-routers and composes them via `.route('/', subRouter)`. The default export is unchanged (still the same shape consumed by `index.ts`).
- **Files NOT touched:** `packages/worker/src/index.ts` (mount path `/api/brands` unchanged), `packages/worker/src/utils/slack.ts` (F-10 owns the Slack module), every other route in `packages/worker/src/routes/`.
- **Routing model:** Hono v4.6 `parent.route('/', child)` merges all `child.METHOD(path, …)` handlers into `parent` with a no-op prefix. There are no method+path conflicts across the three sub-routers — each tuple `(GET '/')`, `(GET '/:id')`, `(POST '/')`, `(PUT '/:id')`, `(DELETE '/:id')`, `(PATCH '/:id/ceo-selections')`, `(PATCH '/:id/ceo-comments/resolve')`, `(PATCH '/:id/status')` is unique. `index.ts` still mounts the assembled root at `/api/brands`, so every external URL resolves to the same handler as before.
- **Dead-code drop:** removed unused `VALID_STATUSES: BrandStatus[]` constant (declared at the top of the legacy file but never referenced anywhere — actual validation flows through `z.enum(['draft','submitted','needs_revision','approved'])` inside `updateStatusSchema`). One inert local (`componentSelections` parsed inside the approve block) is kept verbatim to match the legacy behaviour byte-for-byte.
- **Verification:**
  - `pnpm --filter @brand-constructor/worker type-check` ✓ (0 errors)
  - `pnpm --filter @brand-constructor/worker build` ✓ (wrangler dry-run, 335.98 KiB / 63.72 KiB gzipped — pre-refactor parity)
  - Linter: 0 issues across the 6 new/changed files
  - Skipped curl-smoke: only one D1 binding exists in `wrangler.toml` (the production database is shared by both default and `env.production`), so a local `wrangler dev` would write into prod data. Deferred to manual QA after deploy.
- **F-04 NOT touched:** the approve-batch logic and the surrounding Slack dispatch sites are byte-for-byte identical to the pre-refactor file (same `c.executionCtx.waitUntil(Promise.allSettled([...]))` shape, same try/catch boundaries, same conditional branches). F-09 only moved the handler into a new module and rewrote its imports.
- **Manual QA after deploy:** see deploy section below — full PO + CEO flow on a fresh test brand (draft → wizard → submit → CEO sees in `bc-approvals` → CEO approve → command channels receive 4 messages).
- **Suggested commit message:**
  ```
  refactor(worker): F-09 — split routes/brands.ts (1203 lines) into modular sub-routers

  The single 1203-line monolith is now a thin Hono shell composing three
  role-aligned sub-routers via parent.route('/', subRouter):
    - brands.crud.ts        — list, get-by-id, create, wizard-update, delete
    - brands.ceo.ts         — CEO override paths (selections + comment resolve)
    - brands.status.ts      — PATCH /:id/status (F-04 zone — approve batch +
                              Slack dispatch — moved verbatim, only imports
                              rewritten)

  Pure utilities, types, zod schemas, and constants moved to
  utils/brands.ts. The Slack notification-payload assembler lives in
  routes/brands.notifications.ts next to its single caller.

  Public surface preserved: index.ts still mounts the assembled router at
  /api/brands and every (method, path) tuple resolves to the same handler
  as before. The unused VALID_STATUSES constant was dropped (z.enum(...)
  inside updateStatusSchema is the real validator).

  Refs: docs/audits/enterprise-audit-brand-constructor.md F-09
  ```

---

### F-10 — `slack.ts` (632 lines) declarative section-based renderer
- **Status:** DONE
- **Date completed:** 2026-05-21
- **Severity:** 🟡 Important
- **Phase:** 3
- **Model used:** Opus 4.7
- **Target files:** `packages/worker/src/utils/slack.ts` (632 → 676 lines)
- **Architecture:** Replaced 11 ad-hoc `lines.push(...)` builders with a declarative section model. Each public builder now composes a flat array of `Section` records; a single `renderSection` translates atomic sections (`header` / `field` / `boolField` / `subhead` / `briefDivider` / `bullet` / `italic` / `rawLine` / `spacer`) to text, and a single `buildMessage` wraps the rendered text in the shared `section` + `actions` Slack blocks.
- **Files changed:**
  - `packages/worker/src/utils/slack.ts` — full rewrite. Public API (11 `build*Message` exports, `sendSlackMessage`, types `BrandNotificationData` / `ResolvedComponent` / `BrandRowForSlack`, `CEO_COMMENT_LABELS`) is preserved byte-for-byte, so `routes/brands.ts` was not touched.
- **Files NOT changed:** `packages/worker/src/routes/brands.ts` (caller-side path is owned by F-09).
- **Section model (discriminated union):** `header` / `spacer` / `italic` / `subhead` / `briefDivider` / `rawLine` / `field` / `boolField` / `bullet`. Empty `field` values render to `''` and are dropped by `renderSections` (preserves the original `lines.filter(Boolean)` semantics). Spacers also render to `''` and are filtered — they were dead-code in the legacy file (all `lines.push('')` calls were filtered out before joining), kept in the new code only as visual structure hints.
- **Fragment composers (declarative reuse):** `basicsFragment` (GEO + дата + замовник + опц. режим), `conceptFragment`, `externalNamingFragment`, `internalNamingFragment`, `prPackageFragment`, `deliverablesFragment`, `visualComponentsFragment`, `ceoCommentsFragment` (indent `'  '`, used in approved Strategy/PR/Design), `commentMapFragment` (parametric indent, used twice in `buildNeedsRevisionMessage` with indent `''`), `conceptBriefFragment`, `namingBriefFragment`, `internalNamingBriefFragment`, `submissionSummaryFragment`. Each conditional group (e.g. external naming, internal naming, briefs) is encapsulated inside its fragment and returns `[]` when data is absent — no inline `if (data.x) lines.push(...)` left at builder level.
- **Snapshot verification (byte-equality, mandatory):** wrote a one-off TypeScript harness at `/tmp/slack-snapshot-script.ts` that imports the real builders and runs them against **27 fixed payloads × 11 builders** covering all 5 trigger events:
  - **A** — PO submit, no new briefs (`buildSubmittedMessage`, full + minimal payload)
  - **B** — PO submit with new briefs / CEO bypassed (`buildNewBriefsApprovalMessage` + `buildNewBriefsStrategyMessage` × 3 variants + `buildNewBriefsPrMessage` × 2 + `buildNewBriefsDesignMessage` × 2)
  - **C** — PO resubmit after revision (`buildResubmittedMessage`, full + minimal)
  - **D** — CEO approve (`buildStrategyMessage` × 3 + `buildPrMarketingMessage` × 2 + `buildProductDesignMessage` × 3 + `buildApprovedWorkflowMessage` × 2)
  - **E** — CEO send-back (`buildNeedsRevisionMessage` × 5 edge cases: with/without resolved selections, only-selections, all-whitespace comments, minimal data)
  Ran the script against the legacy code → `/tmp/slack-snapshot-before.json` (sha `2a85d55c…`). Refactored. Ran again → `/tmp/slack-snapshot-after.json`. First diff caught one regression: `buildNewBriefsStrategyMessage` had a quirky header without the standard `<title>: *<name>*` separator (it used `:memo: Нове замовлення для *X*` with a space-and-bold, no colon). Added an explicit `separator` parameter to `header()` (default `': '`, override to `' '` for that one builder). Re-ran snapshot → **byte-identical** across all 27 cases. Snapshot harness and JSON fixtures live only in `/tmp` (not committed), one-shot verification artifact as agreed.
- **Why file grew (632 → 676):** new infrastructure (section union + 9 atomic helpers + 12 fragment composers) adds ~250 lines of pure structure, but the 11 builders themselves shrank from 25–50 lines each (mostly identical-looking imperative `lines.push` sequences) to 10–15 lines of declarative composition. Net +44 LoC; readability and change-safety dramatically improved — adding a new event-message type now means writing a single 12-line `buildXxxMessage` that composes existing fragments, and adding a new field to all "approved" channels means editing one `basicsFragment` instead of patching 3 builders.
- **Verification:** `pnpm --filter @brand-constructor/worker type-check` ✓, `pnpm --filter @brand-constructor/worker build` (wrangler dry-run) ✓, snapshot byte-equality ✓ (27/27).
- **Manual QA after deploy:** trigger each of 3 critical Slack events on the production worker and compare each delivered message side-by-side with a screenshot from before the refactor — see deploy section below.
- **Suggested commit message:**
  ```
  refactor(worker): F-10 — declarative section-based Slack renderer

  Replaced 11 ad-hoc lines.push() builders with a declarative section
  model. Each public buildXxxMessage composes a flat Section[] from
  reusable fragment composers (basics, concept, external/internal
  naming, pr-package, deliverables, visual-components, ceo-comments,
  brief snapshots); a single renderSection translates atoms to text
  and a single buildMessage wraps in the shared section+actions Slack
  blocks.

  Public API (11 builders, sendSlackMessage, types,
  CEO_COMMENT_LABELS) preserved byte-for-byte — routes/brands.ts
  untouched.

  Verified via snapshot byte-equality across 27 payloads × all 11
  builders (PO submit, PO submit with new briefs, PO resubmit, CEO
  approve, CEO send-back; full + minimal + edge-case variants).

  Refs: docs/audits/enterprise-audit-brand-constructor.md F-10
  ```

---

### F-11 — Unify `po-edit/*` & `ceo-reselect/*` views + footer components
- **Status:** DONE
- **Date completed:** 2026-05-21
- **Severity:** 🟡 Important
- **Phase:** 3
- **Model used:** Opus 4.7
- **Target files:** `packages/constructor/src/views/{ceo-reselect,po-edit}/*.vue`, `packages/constructor/src/components/constructor/{ceo-reselect,po-edit}/*Footer.vue`
- **Scope decision (conservative):** Extract genuine duplicates only — shared shell chrome, shared footer, and the read-only CEO comment block. Do NOT merge CEO and PO body markup into a single mode-flag-driven super-component: CEO sees "customer's pick + alternatives", PO sees "PO-previous + CEO-pick side-by-side **or** post-apply single card + alternatives" — these are intentionally different role views and merging them via flags would create exactly the kind of fragile if-tree F-11 is meant to eliminate. All mode flags (`isChained`, `isPostApply`, `localMode`), business logic (session-storage helpers, store mutations, router navigation, API loaders) stay inside each view, untouched.
- **Files added:** new directory `packages/constructor/src/components/constructor/edit-flow/`
  - `EditFlowFooter.vue` (45 lines) — merged the two byte-for-byte identical footers (`CeoReselectFooter` + `PoEditFooter`). Default labels `'Скасувати'` / `'Зберегти'` from PoEditFooter kept; cancel-label / primary-label can still be overridden per-view (Concept screens override to `'Далі'`, External-chained overrides cancel to `'Назад'`).
  - `EditFlowStepShell.vue` (32 lines) — shared chrome: outer `flex flex-col h-full min-h-0` + scrollable inner column with `gap-6 pr-2 pb-4` + title/subtitle header. Default slot for body, `#footer` slot for the sticky footer. Cuts ~13 lines of boilerplate per view × 6 views.
  - `CeoCommentReadonly.vue` (40 lines) — read-only CEO comment block (SVG + label + grey panel). Replaces three byte-for-byte duplicates inside `PoEditConceptView` / `PoEditExternalNamingView` / `PoEditInternalNamingView` (15 lines × 3 = 45 lines collapsed to 1 component import + 1 use site per view).
- **Files removed:**
  - `packages/constructor/src/components/constructor/po-edit/PoEditFooter.vue` (44 lines)
  - `packages/constructor/src/components/constructor/ceo-reselect/CeoReselectFooter.vue` (42 lines)
  - Empty directory `packages/constructor/src/components/constructor/po-edit/` removed.
- **Files modified (all 6 step views):**
  - `views/ceo-reselect/CeoReselectConceptStep.vue` — 206 → 198 lines. Wraps body in `<EditFlowStepShell title=… subtitle=…>`, footer moved to `#footer` slot, `CeoReselectFooter` import → `EditFlowFooter` + `EditFlowStepShell`.
  - `views/ceo-reselect/CeoReselectExternalNamingStep.vue` — 209 → 200 lines. Same shell swap. Dynamic subtitle (depends on `CEO_RESELECT_EXTERNAL_NAMING_LIMIT`) lifted into a `subtitleText` const passed via `:subtitle`.
  - `views/ceo-reselect/CeoReselectInternalNamingStep.vue` — 141 → 132 lines. Same shell swap.
  - `views/po-edit/PoEditConceptView.vue` — 393 → 379 lines. Same shell swap + inline CEO comment block → `<CeoCommentReadonly :value="ceoCeoComment" />`. Subtitle is dynamic (`isPostApply` choice vs. post-apply copy), so lifted into a `computed` `subtitleText`.
  - `views/po-edit/PoEditExternalNamingView.vue` — 235 → 211 lines. Same shell swap + `<CeoCommentReadonly>` + `subtitleText` const for the `CEO_RESELECT_EXTERNAL_NAMING_LIMIT` interpolation.
  - `views/po-edit/PoEditInternalNamingView.vue` — 191 → 161 lines. Same shell swap + `<CeoCommentReadonly>`.
- **Untouched on purpose:** router (all named routes / guards preserved), `ConstructorLayout.vue` (already gated on `route.meta.ceoReselect` / `route.meta.poEdit`), `useConstructorStore` (all `seedCeoReselect*`, `beginEditSection`, `commitEditSection`, `cancelEditSection`, `saveCeoSelections`, `setCeoCommentValue` etc. called as before), and every other component in `ceo-reselect/` (`ConceptGrid`, `ExternalNamingGrid`, `InternalNamingGrid`, `CustomerPickPreview`, `CustomerNamingsRow`, `CustomerInternalNamingPreview`).
- **Verification:** `pnpm --filter @brand-constructor/constructor type-check` ✓ (0 errors), `pnpm --filter @brand-constructor/constructor build` ✓ (same pre-existing chunk-size warning on `pdfmake` / `vfs_fonts`). All 6 views still appear as separate route-level chunks (`CeoReselectConceptStep`, `CeoReselectExternalNamingStep`, `CeoReselectInternalNamingStep`, `PoEditConceptView`, `PoEditExternalNamingView`, `PoEditInternalNamingView`); 3 new shared chunks (`EditFlowStepShell`, `CeoCommentReadonly`, footer pulled into the views). Lints: 0 issues across all 9 changed/added files.
- **Manual QA after deploy:** Full CEO+PO approve flow smoke — see deploy section below. Critical sub-routes to exercise:
  - CEO `submitted` brand → "Перевибрати" on concept → CEO concept screen → pick alternative → "Далі" → CEO external naming chained → "Назад" returns to CEO concept (cancel label `'Назад'`) → re-confirm → "Зберегти".
  - CEO `submitted` brand → "Перевибрати" on external naming standalone → cancel label `'Скасувати'` returns to review without saving.
  - CEO internal naming standalone → "Зберегти".
  - PO `needs_revision` brand → "Редагувати концепт" → choice mode (PO-previous + CEO-pick side-by-side) → pick CEO → "Далі" → if same as PO original → save+return; if different → external-naming chained with `'Назад'` cancel.
  - PO `needs_revision` → "Редагувати External Naming" standalone → PO original grid + CEO grid + "Інші назви" → CEO comment readonly visible if set → save.
  - PO post-apply (`?mode=post-apply`) on each of 3 sections — single applied card + alternatives.
- **Suggested commit message:**
  ```
  refactor(constructor): F-11 — unify CEO/PO edit-flow shell, footer, CEO-comment readonly

  Extract shared chrome from 6 step views into components/constructor/edit-flow/:
  - EditFlowFooter (merged from CeoReselectFooter + PoEditFooter — byte-for-byte dupes)
  - EditFlowStepShell (h-full flex column + scrollable area + title/subtitle header)
  - CeoCommentReadonly (read-only "Коментар СЕО" — 3× duplicate in PO views)

  Body markup, mode flags, store calls, and routing kept inside each view — CEO
  and PO bodies remain intentionally distinct (different role views, not a flag
  switch).

  Refs: docs/audits/enterprise-audit-brand-constructor.md F-11
  ```

---

### F-12 — `store.saveBrand` and other manual `fetch()` calls bypass `useApi`
- **Status:** DONE
- **Date completed:** 2026-05-20
- **Severity:** 🟡 Important
- **Phase:** 2
- **Model used:** Sonnet Thinking (Cursor Agent)
- **Files changed:**
  - `packages/constructor/src/stores/constructor.ts` — `saveBrand()` rewrites raw fetch → `apiPut`/`apiPost`
  - `packages/constructor/src/composables/useBrandPreviewLayers.ts` — `loadVariants()` fetch → `apiGet`
  - `packages/constructor/src/views/steps/Step10ReviewSubmit.vue` — 2× fetch → `apiGet`
- **Verification:** type-check ✓ 0 errors.
- **Suggested commit message:**
  ```
  refactor(constructor): replace raw fetch() with apiPost/apiPut/apiGet

  Refs: docs/audits/enterprise-audit-brand-constructor.md F-12
  ```

---

### F-13 — Step10 re-fetches 4 lists already loaded by `ConstructorLayout`; no cache
- **Status:** DONE
- **Date completed:** 2026-05-20
- **Severity:** 🟡 Important
- **Phase:** 2
- **Model used:** Sonnet Thinking (Cursor Agent)
- **Files changed:**
  - `packages/constructor/src/stores/libraries.ts` — новый Pinia store `useLibrariesStore` с TTL-кэшем 30s
  - `packages/constructor/src/views/ConstructorLayout.vue` — убраны 3 `useApiList`; `loadPreviewData()` → `librariesStore.load(brandId)`
  - `packages/constructor/src/views/steps/Step10ReviewSubmit.vue` — убраны 4 `useApiList` + 4 `fetchXxx()`; `onMounted` → `librariesStore.load(store.brandId)`
- **Verification:** type-check ✓. На шаге 2 → 4 batch-запроса `per_page=100` (скрин); двойной `load()` → 1 fetch (TTL).
- **Manual QA on prod:** smoke — шаг 2 → шаг 8, убедиться нет дублированных per_page=100 запросов.
- **Suggested commit message:**
  ```
  perf(constructor): deduplicate library fetches via useLibrariesStore TTL cache

  Refs: docs/audits/enterprise-audit-brand-constructor.md F-13
  ```

---

### F-14 — Debounce `saveDraftToStorage` (currently fires on every keystroke)
- **Status:** DONE
- **Date completed:** 2026-05-20
- **Severity:** 🟡 Important
- **Phase:** 1
- **Model used:** Sonnet Thinking (Cursor Agent)
- **Files changed:**
  - `packages/constructor/src/stores/constructor.ts` — inline `debounce<T>` helper, 500 ms delay
- **Verification:** type-check ✓
- **Suggested commit message:**
  ```
  perf(constructor): debounce saveDraftToStorage 500 ms

  Refs: docs/audits/enterprise-audit-brand-constructor.md F-14
  ```

---

### F-15 — `BrandPreviewPanel.vue` has another `deep: true` watch
- **Status:** DONE
- **Date completed:** 2026-05-20
- **Severity:** 🟢 Recommendation
- **Phase:** 2
- **Model used:** Sonnet Thinking (Cursor Agent)
- **Files changed:**
  - `packages/constructor/src/components/constructor/BrandPreviewPanel.vue` — watch заменён на `Object.keys(...).join(',')` без `deep`
- **Summary:** `deep: true` триггерил `loadVariants` при смене variantId, хотя `loadVariants` пропускает кэшированные typeIds. Новый watch реагирует только на изменение набора typeIds. `buildLayers` computed подхватывает смену variantId реактивно.
- **Verification:** ReadLints → 0. vue-tsc → exit 0.
- **Manual QA:** Шаг 7 — выбрать/сменить компонент → превью обновляется. Деплой не нужен.
- **Suggested commit message:**
  ```
  perf(constructor): narrow BrandPreviewPanel watch from deep selections to keys

  Refs: docs/audits/enterprise-audit-brand-constructor.md F-15
  ```

---

### F-16 — `createBrandSchema` ≡ `updateBrandSchema`; `z.any()` for briefs
- **Status:** DONE
- **Date completed:** 2026-05-20
- **Severity:** 🟢 Recommendation
- **Phase:** 2
- **Model used:** Sonnet Thinking (Cursor Agent)
- **Files changed:**
  - `packages/worker/src/schemas/brand.ts` — новый файл: `newConceptBriefSchema`, `newNamingBriefSchema`, `brandStepDataSchema` (с `passthrough()` для обратной совместимости), `brandPayloadSchema` (единая схема), `createBrandSchema = brandPayloadSchema`, `updateBrandSchema = brandPayloadSchema`
  - `packages/worker/src/routes/brands.ts` — удалены 50 строк дублирующихся схем; добавлен `import { createBrandSchema, updateBrandSchema } from '../schemas/brand'`; импорт `z` оставлен для остальных схем файла
- **Summary:** 50 строк дублирующегося кода заменены одной базовой схемой. `z.any()` для `newConceptBrief`, `newNamingBrief`, `stepData` заменены на типизированные схемы, соответствующие интерфейсам из `shared/types/brand.ts`. `passthrough()` обеспечивает совместимость с legacy-драфтами.
- **Verification:** ReadLints → 0 ошибок на обоих файлах. tsc → exit 0.
- **Manual QA:** Деплой не нужен — бизнес-логика не изменилась, только валидация стала строже. После деплоя убедиться что сохранение бренда (POST/PUT) проходит без 400.
- **Suggested commit message:**
  ```
  refactor(worker): extract brand Zod schemas; replace z.any() with typed schemas

  createBrandSchema and updateBrandSchema were 50-line byte-for-byte duplicates.
  Extracted to packages/worker/src/schemas/brand.ts as a single brandPayloadSchema.
  Replaced z.any() for newConceptBrief, newNamingBrief, stepData with proper
  typed schemas matching the shared NewConceptBrief, NewNamingBrief, BrandStepData
  interfaces. Uses passthrough() to stay permissive for legacy draft fields.

  Refs: docs/audits/enterprise-audit-brand-constructor.md F-16
  ```

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

  Refs: docs/audits/enterprise-audit-brand-constructor.md F-17
  ```

---

### F-18 — `brands.put('/:id')` 27-branch if-tree for partial update
- **Status:** DONE
- **Date completed:** 2026-05-20
- **Severity:** 🟢 Recommendation
- **Phase:** 2
- **Model used:** Sonnet Thinking (Cursor Agent)
- **Files changed:**
  - `packages/worker/src/routes/brands.ts` — добавлены `UpdateBrandBody`, `FieldTransform`, `UpdatableField`, `UPDATABLE_FIELDS` (23 поля), `applyFieldTransform()`; 23 if-блока (~90 строк) заменены на 6-строчный loop
- **Summary:** Каждое новое поле бренда раньше требовало копипасты трёх строк в PUT-хендлер. Теперь добавляется одна строка в `UPDATABLE_FIELDS`. Transform-типы: `direct`, `nullish`, `bool`, `json`, `json_nullable` — покрывают все случаи.
- **Verification:** ReadLints → 0 ошибок.
- **Manual QA:** Деплой не нужен — сохранение бренда (PUT) должно работать идентично.
- **Suggested commit message:**
  ```
  refactor(worker): replace 23 if-branches in brands.put with UPDATABLE_FIELDS

  Refs: docs/audits/enterprise-audit-brand-constructor.md F-18
  ```

---

### F-19 — `brands.put('/:id')` blocks admin from editing others' brands (silent 404)
- **Status:** DONE
- **Date completed:** 2026-05-20
- **Severity:** 🟢 Recommendation
- **Phase:** 2
- **Model used:** Sonnet Thinking (Cursor Agent)
- **Product decision:** By design — admin не редактирует wizard-шаги чужого бренда, для этого есть ceo-selections и status endpoints.
- **Files changed:**
  - `packages/worker/src/routes/brands.ts` — SELECT убран фильтр `AND created_by = ?`; добавлена явная проверка: если бренд существует но `existing.created_by !== user.id` → 403 с понятным сообщением
- **Summary:** Вместо тихого 404 (бренд есть, но база «не видела» его из-за ownership-фильтра) теперь два отдельных ответа: 404 если бренда нет вообще, 403 если нет прав. Дебаг больше не требует угадывания причины.
- **Verification:** ReadLints → 0 ошибок.
- **Manual QA after deploy:** Залогиниться как admin → PUT /api/brands/{чужой-id} → должен вернуть 403, не 404.
- **Деплой нужен?** Нет (только worker) — но поведение меняется, проверить после планового деплоя.
- **Suggested commit message:**
  ```
  fix(worker): return 403 instead of silent 404 for non-owner PUT brand

  Refs: docs/audits/enterprise-audit-brand-constructor.md F-19
  ```

---

### F-20 — Silent `catch {}` blocks across frontend
- **Status:** DONE
- **Date completed:** 2026-05-20
- **Severity:** 🟢 Recommendation
- **Phase:** 1
- **Model used:** Sonnet Thinking (Cursor Agent)
- **Files changed:**
  - `packages/constructor/src/utils/log.ts` — new `logSilent(scope, err)` helper
  - `packages/constructor/src/composables/useApi.ts` — import + catch
  - `packages/constructor/src/stores/constructor.ts` — 3 catches
  - `packages/constructor/src/composables/useBrandPreviewLayers.ts` — 1 catch
  - `packages/constructor/src/views/ConstructorLayout.vue` — 1 catch
  - `packages/constructor/src/views/steps/Step10ReviewSubmit.vue` — 3 catches
- **Verification:** type-check ✓
- **Suggested commit message:**
  ```
  fix(constructor): replace silent catch{} with logSilent helper

  Refs: docs/audits/enterprise-audit-brand-constructor.md F-20
  ```

---

### F-22 — Remove unused `rejected` brand status from the entire stack
- **Status:** DONE
- **Date completed:** 2026-05-20
- **Date discovered:** 2026-05-20 (during F-06 PR #1 — full repo audit confirmed `rejected` is unreachable from any UI)
- **Severity:** 🟢 Recommendation
- **Phase:** Post-Phase-2 (Sonnet Thinking sized, touches multiple packages — coordinate carefully)
- **Model used:** Sonnet 4.6
- **Target files:**
  - `packages/worker/src/routes/brands.ts` — drop `'rejected'` from `VALID_STATUSES`, `STATUS_TRANSITIONS.submitted`, `updateStatusSchema` enum, the `['approved', 'needs_revision', 'rejected']` role-guard list, and the corresponding "approve/reject brands" error message.
  - `packages/worker/src/schemas/brand.ts` — drop `'rejected'` from `brandStatusSchema` enum (if it lives there too).
  - `packages/shared/src/types/brand.ts` — drop `'rejected'` from `BrandStatus` union.
  - `packages/frontend/src/views/BrandsView.vue` — remove the "Rejected" tab from `STATUS_TABS` and the `rejected` entry from `STATUS_BADGES`.
  - `packages/constructor/src/components/constructor/review/ReviewHeader.vue` — drop the `'rejected'` literal from the `status` type and the `case 'rejected'` badge branch.
  - `packages/constructor/src/composables/usePrintBrand.ts` — drop the `rejected: 'Відхилено'` entry from `STATUS_LABELS`.
  - `docs/audits/enterprise-audit-brand-constructor.md`, `docs/audit/ENTERPRISE-AUDIT-2026-05-20.md`, `docs/PRD-IMPLEMENTATION-AUDIT-2026-03-18.md` — strike-through references.
- **Problem:** `rejected` is a leftover from the v1 PRD (`docs/product-spec/v1-original-prd.md:305`) when CEO had an explicit "Reject" action alongside "Approve". The current product flow keeps only "Approve" and "Send back for revision" — there is no UI surface that calls `PATCH /api/brands/:id/status` with `'rejected'`. The enum value lingers in the worker API, shared types, schema, admin filter and constructor's badge/PDF maps, confusing future contributors and bloating bundle size.
- **Verification confirmed during F-06 PR #1:**
  - Repo-wide grep: `handleStatusChange.*rejected` → 0 matches.
  - `packages/frontend` calls `apiPatch` 0 times — admin SPA has only a *filter* "Rejected" (display, no action).
  - User-confirmed D1 has no `rejected` brands in current data.
- **Recommended change order:**
  1. Worker: remove `'rejected'` from `STATUS_TRANSITIONS.submitted` (the only producer) and from the role-guarded approve list. Keep accepting it temporarily in the Zod enum for one deploy cycle if you want defensive compat, then drop.
  2. shared types: remove from `BrandStatus` union.
  3. Frontend admin SPA: remove tab + badge.
  4. Constructor: remove from `ReviewHeader` type, `usePrintBrand` STATUS_LABELS.
  5. D1: optional — backfill any pre-existing `rejected` rows (if discovered) to `approved` or `submitted` before the enum tightens.
- **Notes:** Coordinated worker + frontend + constructor + shared change. Production D1 confirmed empty of `rejected` rows (user-verified). Commit `39f7f0f`.
- **Files changed:**
  - `packages/shared/src/types/brand.ts` — `BrandStatus` union: removed `'rejected'`
  - `packages/worker/src/routes/brands.ts` — removed from `VALID_STATUSES`, `STATUS_TRANSITIONS` (both as key and value under `submitted`), `updateStatusSchema` enum, role-guard array; updated error message to "approve or send back for revision"
  - `packages/constructor/src/composables/usePrintBrand.ts` — removed `rejected: 'Відхилено'` from `STATUS_LABELS`
  - `packages/constructor/src/components/constructor/review/ReviewHeader.vue` — removed `'rejected'` from `status` prop type and the `case 'rejected'` badge branch
  - `packages/frontend/src/views/BrandsView.vue` — removed `rejected` tab from `STATUS_TABS`, removed `rejected` entry from `STATUS_BADGES`
- **Verification:** `vue-tsc --noEmit` ✓ (constructor + frontend), wrangler dry-run ✓ (worker), production build ✓ (constructor + frontend).

---

### F-21 — `PUT /api/brands/:id` accepts mutations on terminal-state brands
- **Status:** DONE
- **Date completed:** 2026-05-20
- **Date discovered:** 2026-05-20 (during F-19 verification curl)
- **Severity:** 🟡 Important
- **Phase:** Post-Phase-2 (Sonnet Thinking sized; can be picked up before Phase 3 if convenient)
- **Model used:** Sonnet 4.6
- **Target files:** `packages/worker/src/routes/brands.ts` (the `brands.put('/:id', ...)` handler ~line 640+)
- **Problem:** The owner-check restored in F-19 only verifies *who* is editing, not *whether* the brand is in an editable state. A wizard `PUT` from the original creator currently succeeds for brands in `submitted`, `approved`, **and** `rejected`. Verified empirically:
  - `PUT /api/brands/brand_56967c6b7230474f` (status=`approved`) with `{currentStep: 4}` → `200`, `currentStep` was actually mutated. Restored to 8 manually after the test.
  - Status freeze is enforced only on the SPA UI; any direct API client (curl, DevTools, integrations) can still mutate finalised briefs.
- **Recommended change:**
  - Add an editable-status guard at the top of the handler, after ownership check:
    ```ts
    const EDITABLE_STATUSES: readonly BrandStatus[] = ['draft', 'needs_revision'] as const
    if (!EDITABLE_STATUSES.includes(existing.status as BrandStatus)) {
      return c.json(
        { success: false, error: `Brand in status "${existing.status}" cannot be edited via wizard. Use the dedicated CEO/PO/status endpoints.` },
        409
      )
    }
    ```
  - Keep `409 Conflict` (preferred) or `403 Forbidden` — pick one, document in API notes.
  - Keep ceo-selections, status-change, ceo-reselect endpoints unaffected (they have their own guards).
- **Verification plan:**
  - 4× curl through the dev worker (auto-login via `X-Dev-User-Email`):
    1. `submitted` brand + owner → `409`
    2. `approved` brand + owner → `409`
    3. `rejected` brand + owner → `409`
    4. `needs_revision` brand + owner → `200` (must still pass)
    5. `draft` brand + owner → `200` (must still pass)
  - D1 spot-check: confirm no field on the terminal-state brand changed after the rejected PUT.
- **Files changed:** `packages/worker/src/routes/brands.ts` — added `EDITABLE_STATUSES = ['draft', 'needs_revision']` const and guard immediately after the ownership check; returns `409 Conflict` with descriptive error message for `submitted`/`approved` brands.
- **Verification:** wrangler dry-run ✓. Commit `125a531`.
- **Manual QA after deploy:** curl `PUT /api/brands/:submitted-id` → 409; `PUT /api/brands/:approved-id` → 409; `PUT /api/brands/:needs_revision-id` (owner) → 200; `PUT /api/brands/:draft-id` (owner) → 200.
- **Notes:** Was intentionally out of scope for F-19 (which was strictly the 404→403 owner check). `ceo-selections`, `status-change`, and `ceo-reselect` endpoints are separate handlers with their own guards — not affected.
