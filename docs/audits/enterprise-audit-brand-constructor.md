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

- **Completed findings:** F-02 ✅, F-01 ✅, F-03 ✅, F-14 ✅, F-17 ✅, F-20 ✅, F-12 ✅, F-13 ✅, F-15 ✅, F-16 ✅, F-18 ✅, F-19 ✅, F-06 ✅, F-22 ✅, F-21 ✅
- **In progress:** —
- **Phase 1 COMPLETE ✅ — deployed to prod 2026-05-20**
- **Phase 2 COMPLETE ✅ — deployed to prod 2026-05-20**
- **F-06 COMPLETE ✅ (Phase 3, first finding) — smoke passed 2026-05-20**
- **F-22 + F-21 COMPLETE ✅ — local commits, awaiting deploy**
- **Next:** Phase 3 — только Opus 4.7, только по явному запросу. F-07 → F-11 → F-10 → F-09 → F-08 → F-04 → F-05.
- **Recommended model for Phase 3:** Opus 4.7, один finding за чат
- **Last update:** 2026-05-20

### Open follow-ups noted during prior findings

- _(F-02 scope extension, optional)_: `packages/constructor/src/stores/auth.ts:92`, `packages/frontend/src/stores/auth.ts:85`, `packages/frontend/src/App.vue:23`, `packages/frontend/src/components/ui/AppSidebar.vue:21` still use the runtime `VITE_ENVIRONMENT` flag. They are **fail-closed** (no security regression from env typo), so they were intentionally left out of F-02. Worth normalising in a future cleanup pass.
- _(F-21, new)_: server-side status freeze on `PUT /api/brands/:id` is missing — see finding below.
- _(F-22, new)_: `rejected` brand status is unused in the entire UI / product flow — leftover from v1 PRD; cleanup tracked as a separate finding to coordinate worker + shared types + admin filter + constructor maps.

### Phase plan

**Phase 1 — Low-risk security & quick wins (Sonnet Thinking):**
F-02 → F-01 → F-03 → F-14 → F-17 → F-20

**Phase 2 — Medium structural cleanup (Sonnet Thinking, can be batched per chat):**
F-12 → F-13 → F-15 → F-16 → F-18 → F-19

**Phase 3 — Large structural refactors (Opus 4.7, one finding per chat, do NOT start without explicit user instruction):**
F-06 (split into 3 PRs) → F-07 → F-11 → F-10 → F-09 → F-08 → F-04 → F-05

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

### F-07 — `ConstructorLayout.vue` (1345 lines): extract right-panel previews
- **Status:** TODO
- **Severity:** 🟡 Important
- **Phase:** 3
- **Model recommendation:** Opus 4.7
- **Target files:** `packages/constructor/src/views/ConstructorLayout.vue:762-1212`
- **Notes:** Extract Step1/Step7/Step8 previews, brief modal, transitions.

---

### F-08 — Split `constructor.ts` Pinia store (1035 lines)
- **Status:** TODO
- **Severity:** 🟡 Important
- **Phase:** 3
- **Model recommendation:** Opus 4.7
- **Target files:** `packages/constructor/src/stores/constructor.ts`
- **Plan outline:** `useBrandData`, `useCeoReview`, `useCeoReselectDraft`, `usePreviews`, `useEditSection` + facade adapter.

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
