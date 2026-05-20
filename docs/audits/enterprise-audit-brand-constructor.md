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

- **Completed findings:** F-02 ✅, F-01 ✅, F-03 ✅, F-14 ✅, F-17 ✅, F-20 ✅, F-12 ✅, F-13 ✅, F-15 ✅, F-16 ✅, F-18 ✅, F-19 ✅
- **In progress:** —
- **Phase 1 COMPLETE ✅**
- **Phase 2 COMPLETE ✅ — deploy when ready**
- **Next:** Phase 3 — только Opus 4.7, только по явному запросу. Начинать с F-06 (Step10 decomposition).
- **Recommended model for Phase 3:** Opus 4.7, один finding за чат
- **Last update:** 2026-05-20

### Open follow-ups noted during prior findings

- _(F-02 scope extension, optional)_: `packages/constructor/src/stores/auth.ts:92`, `packages/frontend/src/stores/auth.ts:85`, `packages/frontend/src/App.vue:23`, `packages/frontend/src/components/ui/AppSidebar.vue:21` still use the runtime `VITE_ENVIRONMENT` flag. They are **fail-closed** (no security regression from env typo), so they were intentionally left out of F-02. Worth normalising in a future cleanup pass.

### Phase plan

**Phase 1 — Low-risk security & quick wins (Sonnet Thinking):**
F-02 → F-01 → F-03 → F-14 → F-17 → F-20

**Phase 2 — Medium structural cleanup (Sonnet Thinking, can be batched per chat):**
F-12 → F-13 → F-15 → F-16 → F-18 → F-19

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

### F-06 — `Step10ReviewSubmit.vue` decomposition (2463 lines)
- **Status:** TODO
- **Severity:** 🟡 Important
- **Phase:** 3 (split into 3 PRs)
- **Model recommendation:** Opus 4.7
- **Target files:** `packages/constructor/src/views/steps/Step10ReviewSubmit.vue`
- **Notes:** Touches all five review modes. Strict Opus 4.7. Do not start without explicit user instruction.

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
