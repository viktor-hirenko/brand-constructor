# Enterprise Audit — Brand Constructor

> **Дата:** 20 мая 2026
> **Скоуп:** `packages/constructor` + `packages/worker` + `packages/shared`
> **Метод:** static code analysis по 12 областям (без runtime / без замера бандла)

---

## TL;DR — Top 5 highest-impact refactor targets

1. **Публичный debug-endpoint `/api/debug/pananames` + dev-bypass роутеров.** В `packages/worker/src/index.ts:43-69` `/api/debug/pananames` зарегистрирован **до** `authMiddleware`, доступен без токена, делает live-вызов к Pananames и возвращает превью подписи. Одновременно `packages/constructor/src/router/index.ts:311` и `packages/frontend/src/router/index.ts:66` в начале глобального `beforeEach` делают `if (VITE_ENVIRONMENT === 'development') return true` — *любая* ошибка в env при деплое снимает все guard'ы. Фикс: удалить/закрыть auth'ом debug-ручку, заменить `VITE_ENVIRONMENT === 'development'` на `import.meta.env.DEV` (compile-time константа Vite). См. F-01, F-02.

2. **`Step10ReviewSubmit.vue` — 2463 строки, ~700 строк фактически мертвого `v-else`-блока + 600 строк инлайн-SVG.** `unifiedReviewLayout` уже покрывает `ceo / po-draft / po-returned / po-submitted / approved`, а `v-else`-ветка (1758–2439) достигается только при `status === 'rejected'` либо CEO-on-draft (де-факто никогда). Файл одновременно реализует 5 review-режимов, генерирует PDF-данные, тащит inline-SVG. Фикс: удалить `v-else` после live-проверки `rejected`-ветки; вынести summary-data, режим-зависимый footer и icon-set в отдельные модули. См. F-03, F-06.

3. **Stores layer: 1 Pinia store на всё — `constructor.ts` (1035 строк) + watch `stepData` с `deep:true` на каждую правку.** Один store держит wizard-state, CEO comments/selections, CEO-reselect draft, concept/PR-package preview, persistence в `localStorage`. Любая правка в любом поле триггерит `JSON.stringify(stepData)` и запись в `localStorage` (constructor.ts:371) — на каждый keystroke в textarea. Фикс: расщепить на `useBrandData`, `useCeoReview`, `useCeoReselectDraft`, `usePreviews`; обернуть `saveDraftToStorage` в debounce 300-500ms. См. F-08, F-15.

4. **`packages/worker/src/routes/brands.ts` — 1282 строки + non-atomic approve flow.** Handler `PATCH /:id/status` (911–1239) длиной ~330 строк сшивает: проверку перехода, RBAC, апдейт статуса, 4 разных Slack-сценария. На `approved` (1101–1234) сначала `UPDATE brands SET status='approved'` (986), потом отдельный `SELECT`, потом `db.batch([...])` для пометки concepts/external/internal/pr_packages `used`. Если batch упадёт — бренд уже approved, но библиотечные записи не помечены `used` → дубль-выдача того же концепта другому бренду. Фикс: расщепить файл на `brands.crud.ts` / `brands.status.ts` / `brands.ceo.ts`; в approve-ветке делать единый `db.batch([...status, ...libraryMarks])`. См. F-04, F-09.

5. **Дублирование между `ceo-reselect/*`, `po-edit/*`, и footer-компонентами.** `PoEditFooter.vue` и `CeoReselectFooter.vue` практически побайтно идентичны (см. F-11). Каждая из 3 пар вью (`CeoReselectConceptStep` ↔ `PoEditConceptView`, …External…, …Internal…) повторяет одну и ту же структуру: load list → customer-pick block → available grid → comment field → footer; общая часть составляет ~70% кода. Фикс: один `<SelectionStepShell>` со слотами `customer-pick / ceo-pick / available-grid / comment`, один общий `<SelectionStepFooter>`; сценарий-зависимая логика остаётся в обёртке. См. F-10, F-11.

---

## Findings

### 🔴 Critical

#### F-01 — Публичный debug-endpoint утечки API signature
- **Area:** Security (Backend)
- **Location:** `packages/worker/src/index.ts:43-69` (плюс порядок регистрации middleware на `:84-96`)
- **Problem:** Маршрут `/api/debug/pananames` зарегистрирован раньше `app.use('/api/*', authMiddleware)` (`index.ts:88`). Он публично возвращает `hasSignature` и **первые/последние 8 символов production-подписи Pananames**, а также выполняет внешний HTTP-вызов от имени worker'а — фактически SSRF/leak-канал.
- **Why it matters:** Любой анонимный пользователь продакшна может (а) подтвердить наличие ключа, (б) получить опорные символы для bruteforce, (в) бесконтрольно генерировать вызовы к платному внешнему API за счёт нашего ratelimit/квоты.
- **Suggested fix:** Либо полностью удалить хендлер (если он был для одноразовой отладки), либо: (1) перенести регистрацию **после** `app.use('/api/*', authMiddleware)`, (2) обернуть в `requireAdmin`, (3) убрать из ответа `signaturePreview`, (4) тестовое имя домена сделать query-параметром.
- **Effort:** S
- **Verification needed?** No

#### F-02 — Глобальный bypass роут-гардов через `VITE_ENVIRONMENT`
- **Area:** Security (Frontend) / Routing & Navigation Guards
- **Location:** `packages/constructor/src/router/index.ts:310-331`, `packages/frontend/src/router/index.ts:64-82`
- **Problem:** Оба роутера начинают `router.beforeEach` со строки `if (import.meta.env.VITE_ENVIRONMENT === 'development') return true`. Любой `requiresAuth`, `briefCreatorOnly`, role-check после этого пропускается. Условие построено на пользовательской runtime-переменной — опечатка в `.env.production` (`VITE_ENVIRONMENT=development` оставлено по копипасте) полностью отключает фронтенд-RBAC. Бэкенд защищает данные, но UI пускает любого пользователя на любые роуты, что для интернала с CEO-полномочиями опасно само по себе.
- **Why it matters:** Single-point-of-failure безопасности UI; ошибка в одной переменной → утрата всех guard'ов на двух SPA.
- **Suggested fix:** Заменить `import.meta.env.VITE_ENVIRONMENT === 'development'` на встроенную compile-time константу `import.meta.env.DEV` (Vite гарантирует `false` для prod build). Дополнительно: вынести dev-bypass в отдельный плагин/файл, который вообще не попадает в production bundle через tree-shaking.
- **Effort:** S
- **Verification needed?** Yes — убедиться, что в e2e нет тестов, опирающихся на runtime-переключение этого флага.

#### F-03 — Frontend admin SPA не делает role-check на роутах
- **Area:** Security / Routing & Navigation Guards
- **Location:** `packages/frontend/src/router/index.ts:6-62`
- **Problem:** В роутере admin-панели нет ни `meta.requiresAuth`, ни `meta.roles`. Глобальный guard только проверяет `isAuthenticated`. Любой авторизованный пользователь (например `product_owner`, `strategy_identity`, `pr_marketing`) может открыть `/users`, `/components`, `/concepts/admin`-страницы. Бэкенд отдаёт 403, но UI рендерится, показывает структуру меню и иногда успевает кэшировать ответы 403 в Pinia.
- **Why it matters:** Утечка структуры админских функций пользователям, которым они не предназначены; плохой UX (страница вместо явного "Доступ запрещён"); противоречит модели ролей (`admin / head_dhc` only).
- **Suggested fix:** Добавить `meta.roles: ['admin','head_dhc']` (и где надо — `'cpo_ceo'`) к админ-роутам; в `beforeEach` после проверки `isAuthenticated` сравнивать `authStore.user.role` со списком из `meta.roles`. Логика уже доступна в `packages/shared` (`ADMIN_ROLES`, `BRAND_APPROVAL_ROLES`).
- **Effort:** S
- **Verification needed?** No

#### F-04 — Не-атомарный approve flow в `PATCH /:id/status`
- **Area:** Worker / Backend Architecture
- **Location:** `packages/worker/src/routes/brands.ts:911-1239` (целевые строки 986-988 + 1135-1198)
- **Problem:** Сначала выполняется `UPDATE brands SET status = 'approved' …` отдельным `prepare().run()` (строки 966-988). Затем (1101-1234) — повторный `SELECT` бренда, расчёт `finalConceptId/finalExtIds/finalIntId`, и **отдельный** `db.batch([...])` помечает concepts/external_namings/internal_namings/pr_packages статусом `used`. Если batch упадёт (D1 timeout, runtime error в массиве), бренд останется approved, а библиотечные сущности — не отмечены `used`, что разрешит выбрать тот же концепт другому бренду.
- **Why it matters:** Нарушение бизнес-инварианта "один утверждённый концепт → один бренд", потенциальная коллизия в библиотеке. Также Slack-нотификация уже улетела (waitUntil), а консистентного состояния нет.
- **Suggested fix:** Сделать единый `db.batch([...])` со всеми UPDATE-стейтментами: статус бренда, опциональный апдейт `concept_id/external_naming_ids/internal_naming_id`, маркировка библиотечных таблиц. D1 батч атомарен. Slack-вызов оставить через `waitUntil` **после** успеха batch'а.
- **Effort:** M
- **Verification needed?** No

#### F-05 — JWT хранится в `localStorage` (XSS-эскалация)
- **Area:** Security (Frontend)
- **Location:** `packages/constructor/src/stores/auth.ts:6-30, 79`; `packages/constructor/src/composables/useApi.ts:12-21`; аналогично `packages/frontend/src/stores/auth.ts`
- **Problem:** После `loginWithGoogle` пара `{ user, token }` записывается в `localStorage`. Заголовок `Authorization: Bearer <token>` берётся напрямую из `localStorage` при каждом запросе. Любой XSS (например, в user-supplied поле `linkedProduct` или CEO comment, отображаемом через `v-html` где-то — *⚠️ нужно подтвердить, что нигде не используется `v-html` на user input*) даст атакующему долгоживущий токен.
- **Why it matters:** Стандартная и хорошо известная поверхность атаки; для интернала с админ-ролями токены особенно чувствительны.
- **Suggested fix:** Хранить токен в `HttpOnly; Secure; SameSite=Strict` cookie, выставляемом worker'ом на `/api/auth/google`. CSRF гасить заголовком `X-CSRF-Token` из meta-тега + same-origin policy (CORS уже whitelisted). На фронте удалить чтение токена, оставить только `credentials: 'include'` в `request()`. Альтернатива промежуточная (если cookie стратегия не зайдёт): хранить только refresh-token в HttpOnly cookie, а access-token в памяти модуля (без `localStorage`), пере-выдавая по `/api/auth/refresh`.
- **Effort:** L
- **Verification needed?** Yes — пройти по `*.vue` поиском `v-html` и `innerHTML` на пользовательских данных; от этого зависит срочность фикса.

---

### 🟡 Important

#### F-06 — `Step10ReviewSubmit.vue`: 2463 строки, мёртвая `v-else`-ветка, 5 review-режимов в одном файле
- **Area:** Bloated Components / Dead Code
- **Location:** `packages/constructor/src/views/steps/Step10ReviewSubmit.vue:1-2463` (legacy ветка `1758-2439`)
- **Problem:** Computed `unifiedReviewLayout` (lines 755-762) объединяет `ceoFinalize || poDraft || isPoReturnedView || poSubmittedView || approvedReadOnlyView`. Ветка `v-else` (`1758-2439`, ~680 строк включая ~600 строк инлайн-SVG) достигается только при `brandStatus === 'rejected'` либо при CEO viewing draft — фактически непроходимые пути в нормальном flow. Вдобавок файл смешивает: 5 ReviewMode-веток, PDF generation, ручные fetch'и для component variants (`287, 1283`), inline SVG-набор иконок (~15 штук).
- **Why it matters:** Это самый частый touch-point для всех CEO/PO задач; 2.5K строк на один SFC = нерабочий blame, длинные diffs, неизбежные регрессии в режимах, которые reviewer не успел проверить.
- **Suggested fix:** Поэтапно:
  1. Подтвердить unreachability `v-else` (логи / try-rejected), затем удалить блок целиком (минус 700 строк за один PR).
  2. Вынести SVG-иконки в `@/components/icons/index.ts` (named exports) или один `<SummaryIcon :name="...">` (минус ~600 строк).
  3. Расщепить unified-разметку по reviewMode на маленькие компоненты: `<Step10ReviewCeo>`, `<Step10ReviewPoDraft>`, `<Step10ReviewPoReturned>`, `<Step10ReviewPoSubmitted>`, `<Step10ReviewApproved>` (или один `<Step10ReviewLayout :mode="reviewMode">` со слотами `header / sections / footer`).
  4. Вынести PDF-сборку (`handlePrintBrand`, lines 1270-1344) в `usePrintBrandData` composable, чтобы view'хи не лезли напрямую в `pdfmake`.
- **Effort:** XL
- **Verification needed?** Yes — для шага 1 проверить, что `rejected` бренды реально проходят `unifiedReviewLayout` (через `approvedReadOnlyView` — нет, не проходят, status === 'rejected' попадает в `v-else`; см. PRD).

#### F-07 — `ConstructorLayout.vue`: 1345 строк, право-панель содержит 4 inline-preview ветки
- **Area:** Bloated Components / Component Architecture
- **Location:** `packages/constructor/src/views/ConstructorLayout.vue:762-1212`
- **Problem:** Один файл оркестрирует: viewport-scale, role-based shell-флаги (5 `isXxxReview` computed), Step1/2/3-4/7/8 right-panel previews (каждый ~80-200 строк инлайн), `<Teleport>` brief-modal, `<Transition>`-оверлеи concept/PR preview. Шаг 7 (iPhone+layers) занимает ~130 строк инлайн в template. Дублирование SVG (calendar/file-text/etc.) с Step10.
- **Why it matters:** Любой touch на одном шаге заставляет ревьюера держать в голове всю карту flow; постоянные мердж-конфликты между `ceo-reselect` и `po-edit` задачами; rendering-cost — все 4 preview-ветки висят в template (даже если показывается только одна).
- **Suggested fix:**
  1. Вынести `Step1Preview`, `Step7iPhonePreview`, `Step8SummaryPreview` в `@/components/constructor/previews/` (каждый принимает `store` через композаблу или props).
  2. Brief-modal (`<Teleport>`-блок 1261-1322) вынести в `<BriefModal v-model:kind="activeBrief">`.
  3. `concept-backdrop` + `concept-panel` `<Transition>`-обёртки заменить на единый `<RightPanelOverlay>`.
  4. Все computed-флаги (`isCeoFinalize / isPoDraftReview / …`) перенести в `useReviewShell()` composable, чтобы Step10ReviewSubmit (F-06) пользовался тем же источником истины.
- **Effort:** L
- **Verification needed?** No

#### F-08 — `constructor.ts` store: 1035 строк, 7 несвязанных доменов в одном Pinia store
- **Area:** State Management Architecture
- **Location:** `packages/constructor/src/stores/constructor.ts:81-1035`
- **Problem:** Один setup-store держит: wizard step state (`currentStep / stepData / validateStep`), brand persistence (`saveBrand` с raw `fetch`), CEO comments + resolved-flow (`setCeoCommentValue` / `setCeoCommentResolved`), CEO selections + applyCeoVariant, CEO-reselect draft (отдельная подсхема), concept/PR-package preview, edit-section snapshot, localStorage draft, scroll-position. Любая правка в любой части приводит к перестраиванию большой реактивной graph'ы.
- **Why it matters:** Тесты невозможны без поднятия всего стора; cross-coupling между Step10 review и CEO-reselect (которые могли бы быть полностью отдельны); long re-renders при `deep: true` watcher'ах (см. F-15).
- **Suggested fix:** Поэтапно расщепить:
  - `useBrandDataStore` — `stepData`, `validateStep`, `saveBrand`, `loadBrand`, draft-storage.
  - `useCeoReviewStore` — `brandCeoComments / brandCeoSelections`, `setCeoCommentValue`, `setCeoCommentResolved`, `applyCeoVariant`, `applyCeoConceptAndExternal`, `saveCeoSelections`.
  - `useCeoReselectDraftStore` — `ceoReselectDraft`, `seedCeoReselectFromBrand`, `setCeoReselect*`.
  - `usePreviewsStore` — `conceptPreviewOpen/...Id`, `prPackagePreviewOpen/...Package`, `step10ScrollTop`, `step3PreviewSlideIndex`.
  - `useEditSectionStore` — `editingSection`, `beginEditSection / commit / cancel`, `returnToStep`.
  Делать по одному store за PR, с adapter-фасадом `useConstructorStore()` на переходный период (чтобы не переписывать все view сразу).
- **Effort:** XL
- **Verification needed?** No

#### F-09 — `brands.ts`: 1282 строки, status-handler 330 строк, дублированные WHERE-ветки
- **Area:** Worker / Backend Architecture
- **Location:** `packages/worker/src/routes/brands.ts:1-1282` (особо: PATCH `/:id/status` 911-1239; GET `/` 456-520; GET `/:id` 522-551; `createBrandSchema` ≡ `updateBrandSchema` 44-94)
- **Problem:**
  - `PATCH /:id/status` (911-1239) делает: проверку перехода → RBAC → UPDATE → 4 разных Slack-сценария (submitted-with-briefs, submit, resubmit, needs_revision, approved). Длинный nested if внутри одной функции.
  - `GET /` и `GET /:id` дважды повторяют тройной if `canSeeAll / isCreator / external` (456-477 + 495-501; 530-543).
  - `createBrandSchema` и `updateBrandSchema` (44-94) — побайтная копия (50 строк дубля). Поля `newConceptBrief / newNamingBrief / stepData` объявлены как `z.any()` — клиент может положить произвольный JSON в эти JSON-колонки.
- **Why it matters:** Самый горячий бэкенд-файл; каждое изменение flow требует править в 3-4 местах; `z.any()` обходит вообще всю валидацию briefs.
- **Suggested fix:**
  - Расщепить файл: `brands.crud.ts` (GET/POST/PUT/DELETE), `brands.status.ts` (PATCH status + side-effects), `brands.ceo.ts` (PATCH ceo-selections + ceo-comments/resolve), `brands.notifications.ts` (build*+sendSlack). Объединить под `brands = new Hono().route(...)`.
  - Извлечь `buildBrandWhereClauseForUser(user)` → `{ sql, params }`, использовать в GET `/` и `/:id`.
  - Внутри status-handler: вынести `handleSubmitTransition`, `handleNeedsRevisionTransition`, `handleApproveTransition` как self-contained функции — каждая принимает `(brand, body, env)` и возвращает batch-statements + slack messages.
  - Переписать schemas как `const baseBrandFieldsSchema = z.object({…})`; `createBrandSchema = baseBrandFieldsSchema`; `updateBrandSchema = baseBrandFieldsSchema.partial()` (с правильной обработкой required).
  - Заменить `z.any()` на полноценные `newConceptBriefSchema / newNamingBriefSchema / stepDataSchema` (поднять в `packages/shared/src/schemas/` чтобы и фронт мог reuse).
- **Effort:** XL
- **Verification needed?** No

#### F-10 — `slack.ts`: 632 строки, 9 message-builder'ов с дублированной структурой
- **Area:** Worker / Backend Architecture / Code Duplication
- **Location:** `packages/worker/src/utils/slack.ts:148-632`
- **Problem:** 9 функций `build*Message` следуют идентичному шаблону: `header → lines = [field(…), field(…), …] → buildBlocks(lines, brandId, url)`. Секции «Brand basics», «Концепт», «External Naming», «PR Package», «Deliverables», «Visual Components», «Коментарі CEO» копируются между Strategy/PrMarketing/ProductDesign/NewBriefsStrategy/NewBriefsPr/NewBriefsDesign. Изменение лейбла или порядка поля требует апдейта в 4-6 местах.
- **Why it matters:** Любая правка business-копи (например, CEO попросил переименовать «Дедлайн розробки» → «Production deadline») обходит код через grep-replace и легко рассыпается.
- **Suggested fix:** Декларативный подход:
  ```ts
  type Section = { title?: string; rows: Array<{ label: string; value: string|null|boolean }> }
  function renderSections(sections: Section[]): string[] { … }
  ```
  Каждый `build*Message` собирает массив `Section[]` (повторно используя `basicsSection(data)`, `conceptSection(data)`, `deliverablesSection(data)`, `componentsSection(data)`, `ceoCommentsSection(data)`), передаёт в общий рендер. Header / общий футер — функция-обёртка `buildSlackMessage(channel, header, sections, brandId, url)`. Ожидаемое сокращение: 632 → 250-300 строк, новые каналы добавляются за 5 строк.
- **Effort:** M
- **Verification needed?** Yes — после рефакторинга прогнать сравнение строк Slack-сообщений на стейджинге (или snapshot-тест).

#### F-11 — `PoEditFooter.vue` ≡ `CeoReselectFooter.vue`; 3 пары вью дублируют 70% логики
- **Area:** Component Architecture & Duplication
- **Location:** `packages/constructor/src/components/constructor/po-edit/PoEditFooter.vue` ↔ `packages/constructor/src/components/constructor/ceo-reselect/CeoReselectFooter.vue`; `packages/constructor/src/views/ceo-reselect/CeoReselect{Concept,ExternalNaming,InternalNaming}Step.vue` ↔ `packages/constructor/src/views/po-edit/PoEdit{Concept,ExternalNaming,InternalNaming}View.vue`
- **Problem:**
  - Два footer-компонента побайтно одинаковы (template, props, emits) — отличаются только опциональностью `cancelLabel?` в PoEdit.
  - Каждая пара вью повторяет: `loadList()` через `useApiList`, customer-pick block, available-grid (через общий `ConceptGrid / ExternalNamingGrid / InternalNamingGrid`), `StepCommentField` (CEO) или read-only CEO comment (PO), `seedFromBrand` / `beginEditSection`. PoEdit имеет дополнительные ветки (`isChained`, `isPostApply`) — но они отлично выделяются как варианты одного компонента.
- **Why it matters:** При любой правке UX (например, новый лейбл «Залишити вибір CEO») приходится синхронно править 6 файлов; рассинхронизация между CEO и PO flow уже фиксируется визуально (немного разные отступы, лейблы).
- **Suggested fix:**
  1. Заменить оба footer'а одним `<SelectionStepFooter>` в `@/components/constructor/shared/` — удалить оба старых.
  2. Сделать `<SelectionStepLayout>` со слотами:
     - `#customer-pick` — карточка PO-выбора (CeoReselect) или dual «PO previous / CEO pick» (PoEdit, choice mode).
     - `#available-grid` — основной grid.
     - `#comment` — CEO `StepCommentField` либо read-only PO-view CEO comment.
     - `#footer` — `<SelectionStepFooter>`.
  3. Каждая из 6 вью сжимается до ~80 строк: загрузка данных + сценарий-специфичная логика, без template-дублей.
- **Effort:** L
- **Verification needed?** No

#### F-12 — `store.saveBrand` обходит `useApi`; ручные `fetch()` в 4 местах фронта
- **Area:** API Layer / Data Fetching
- **Location:** `packages/constructor/src/stores/constructor.ts:866-944`; `packages/constructor/src/composables/useBrandPreviewLayers.ts:77-89`; `packages/constructor/src/views/steps/Step10ReviewSubmit.vue:287-303 + 1281-1300`
- **Problem:** При наличии хорошо построенного `useApi.ts` (`apiPost / apiPut / apiPatch / apiGet` + унифицированный error-handler) ключевой `store.saveBrand` строит запрос руками: `fetch + JSON.stringify + getAuthHeader + ручная обработка !response.ok`. То же — в `useBrandPreviewLayers.loadVariants` и в `Step10ReviewSubmit.loadComponentSelectionDetails` / `handlePrintBrand`. Каждое такое место повторяет одну и ту же ошибочную модель: молча проглатывает 401 / network error (catch без логирования).
- **Why it matters:** Расхождения в headers (например, при будущем переезде на cookie-auth — F-05 — надо будет править в 5 файлах вместо одного), потеря телеметрии при сетевых ошибках, дублированный кода.
- **Suggested fix:**
  - Переписать `saveBrand` через `apiPut<Brand>(\`/api/brands/\${id}\`, payload)` и `apiPost<Brand>('/api/brands', payload)`.
  - `loadComponentSelectionDetails` (Step10) и `loadVariants` (useBrandPreviewLayers) обернуть в `apiGet<ComponentTypeWithVariants>('/api/components/types/:id/variants?status=all')`.
  - В `useApi.request<T>()` добавить опциональный callback `onError` для централизованной телеметрии.
- **Effort:** S
- **Verification needed?** No

#### F-13 — Step10 повторно фетчит 4 списка, которые уже загрузил `ConstructorLayout`; нет кэша
- **Area:** API Layer / Performance
- **Location:** `packages/constructor/src/views/steps/Step10ReviewSubmit.vue:185-218` ↔ `packages/constructor/src/views/ConstructorLayout.vue:221-235, 478-509`
- **Problem:** `ConstructorLayout` на step 8 фетчит concepts / external namings / internal namings (с `per_page=100`). Тут же `Step10ReviewSubmit.onMounted` фетчит **те же** 4 списка (concepts / external / internal + pr_packages) повторно. Возврат с CEO-reselect или PO-edit пере-mount'ит layout → ещё один цикл из 4 запросов. На каждом round-trip — 4-8 лишних D1-запросов.
- **Why it matters:** Деградация TTI на ключевом review-экране, лишняя нагрузка на D1 (worker free-tier лимиты), мерцание UI пока списки не подъехали (внутренние ID не резолвятся в имена).
- **Suggested fix:** Реализовать lightweight cache на уровне composable: `useApiList(url, { cacheKey: url+params, ttlMs: 30000 })` через `Map<string, { data, fetchedAt }>` модуль-локально. Либо вынести «справочники» (concepts/namings/pr-packages) в выделенный Pinia store `useLibrariesStore` с lazy-load + invalidate по `useApiPatch`/`useApiPost` события из admin-панели. На переходный период: убрать дубль-фетч из Step10 и брать данные из `useLibrariesStore.concepts`.
- **Effort:** M
- **Verification needed?** Yes — подтвердить в Network вкладке, что layout всегда подгружает все 4 списка к моменту маунта Step10 (если timing не гарантирован — кэш-композабла важнее, чем удаление вызовов).

#### F-14 — `watch(stepData, …, { deep: true })` → запись в `localStorage` на каждый keystroke
- **Area:** Performance / State Management
- **Location:** `packages/constructor/src/stores/constructor.ts:371`
- **Problem:** Любая микро-правка реактивного поля (включая `textarea` каждой буквой) триггерит `saveDraftToStorage` → `JSON.stringify(stepData) + localStorage.setItem`. `stepData` достаточно крупный (включает `componentSelections`, briefs, comments). `localStorage.setItem` синхронен и блокирует main thread.
- **Why it matters:** Тормозит длинные textarea (especially CEO general comment), увеличивает jank на дешёвых машинах; при 5KB stepData и 60wpm typing получается ~300KB/мин записи в `localStorage`.
- **Suggested fix:** Дебаунс через `useDebounceFn` из VueUse или ручной `setTimeout`:
  ```ts
  const debouncedSave = useDebounceFn(saveDraftToStorage, 500)
  watch(stepData, debouncedSave, { deep: true })
  ```
  Дополнительно — на `beforeunload` форсировать `saveDraftToStorage()` чтобы не потерять последние правки.
- **Effort:** S
- **Verification needed?** No

#### F-15 — `BrandPreviewPanel.vue` имеет ещё один `deep: true` watch
- **Area:** Performance
- **Location:** `packages/constructor/src/components/constructor/BrandPreviewPanel.vue:17`
- **Problem:** Файл сам по себе небольшой, но он установлен в правую панель Step10 / CEO-finalize / approved view и держит активный `deep:true` watch (предположительно над тем же `stepData`). На длительных CEO-сессиях с правкой комментариев это потенциально удваивает re-render right-panel preview.
- **Why it matters:** Не критично, но в сочетании с F-14 даёт ощутимый jank на скроле Step10.
- **Suggested fix:** Прочитать файл и сузить watch до конкретного среза (`() => store.stepData.visualComponents.selections`, без `deep`), либо заменить на `computed` + автоматическая реактивность.
- **Effort:** S
- **Verification needed?** Yes — прочитать `BrandPreviewPanel.vue` целиком и подтвердить, что watch действительно избыточен (файл не открывался в этом аудите).

---

### 🟢 Recommendation

#### F-16 — `createBrandSchema` ≡ `updateBrandSchema`; нет валидации briefs/stepData
- **Area:** Worker / TypeScript Quality
- **Location:** `packages/worker/src/routes/brands.ts:44-94`
- **Problem:** 50 строк дублирующейся zod-схемы. `newConceptBrief / newNamingBrief / stepData` объявлены как `z.any()` — фактически выключают валидацию для самых больших полей. Эти JSON-поля затем попадают в `stepData` фронт-стора без проверки структуры.
- **Suggested fix:** В `packages/shared/src/schemas/brand.ts` создать `newConceptBriefSchema`, `newNamingBriefSchema`, `brandStepDataSchema` (с использованием того же набора полей, что и интерфейсы в `shared/types/brand.ts`). В worker импортировать их и заменить `z.any()`. Объявить `baseBrandFieldsSchema`, из которого `createBrandSchema = base.partial({…required})`, `updateBrandSchema = base.partial()`.
- **Effort:** M
- **Verification needed?** No

#### F-17 — `brands.delete('/:id')` не атомарен
- **Area:** Worker / Backend Architecture
- **Location:** `packages/worker/src/routes/brands.ts:1241-1280`
- **Problem:** 4 последовательных `prepare().run()` (concepts → external_namings → internal_namings → DELETE brands). Если падёт второй — concepts уже «освобождены», но external_namings остались с `used_in_brand_id = <deleted_id>`. Бренд может остаться частично удалён.
- **Suggested fix:** Завернуть все 4 statement в `db.batch([...])` — атомарно. Параллельно — добавить проверку, что в `STATUS_TRANSITIONS` нет `delete` отдельным действием (сейчас всё хорошо).
- **Effort:** S
- **Verification needed?** No

#### F-18 — `brands.put('/:id')`: 27 одинаковых if-веток для partial-update
- **Area:** Worker / Code Duplication
- **Location:** `packages/worker/src/routes/brands.ts:667-762`
- **Problem:** 27 одинаковых блоков `if (body.X !== undefined) { updates.push('x = ?'); values.push(...) }`. Каждый новый brand-field требует копи-паст-врезку в 3 местах (schema, update branch, rowToBrand).
- **Suggested fix:** Декларативный mapping:
  ```ts
  const UPDATABLE_FIELDS: Array<{ key: keyof UpdateBrand; column: string; toDb?: (v: any) => unknown }> = [
    { key: 'internalName', column: 'internal_name' },
    { key: 'externalNamingIds', column: 'external_naming_ids', toDb: JSON.stringify },
    { key: 'legalLanding', column: 'legal_landing', toDb: v => v ? 1 : 0 },
    // …
  ]
  for (const f of UPDATABLE_FIELDS) {
    if (body[f.key] !== undefined) {
      updates.push(`${f.column} = ?`)
      values.push(f.toDb ? f.toDb(body[f.key]) : body[f.key])
    }
  }
  ```
  ~95 строк → ~30 строк + центральный source-of-truth для column-mapping.
- **Effort:** S
- **Verification needed?** No

#### F-19 — `brands.put('/:id')` не позволяет админу править чужой бренд
- **Area:** Worker / RBAC
- **Location:** `packages/worker/src/routes/brands.ts:659-665`
- **Problem:** `WHERE id = ? AND created_by = ?` — даже `admin` / `head_dhc` получают 404 при попытке отредактировать чужой брenden через PUT. Может быть by design (CEO правит через `ceo-selections / ceo-comments`), но не очевидно из кода.
- **Suggested fix:** Либо явно отбить попытки админа PUT'ить чужой бренд (возвращать 403 с пояснением «admin использует ceo-selections endpoint»), либо разрешить admin'ам править (`canSeeAll ? WHERE id=? : WHERE id=? AND created_by=?`). Текущее поведение «тихое 404» хуже всего — путает дебаг.
- **Effort:** S
- **Verification needed?** Yes — уточнить с продуктом, нужна ли админу возможность править чужой бренд через PUT.

#### F-20 — Молчаливые `catch` без логирования
- **Area:** Error Handling & Resilience
- **Location:** `packages/constructor/src/composables/useApi.ts:18` (`getAuthHeader`), `packages/constructor/src/stores/constructor.ts:335, 348, 367` (draft storage), `packages/constructor/src/views/steps/Step10ReviewSubmit.vue:300, 1296` (component variants fetch), `packages/constructor/src/composables/useBrandPreviewLayers.ts:85`, `packages/constructor/src/views/ConstructorLayout.vue:474` (concept details fetch)
- **Problem:** Не менее 10 мест с `catch {}` или `catch { /* ignore */ }` без какого-либо логирования. При интеграционных проблемах (например, обновление формата ответа `/api/components/types/:id/variants`) UI просто «не показывает имена компонентов», без подсказки в консоли.
- **Suggested fix:** Ввести модульный логгер (`@/utils/log.ts`): `function logSilent(scope: string, err: unknown)` → `console.warn('[bc:'+scope+']', err)` в dev; no-op в prod (или Sentry в будущем). Заменить все silent catch'и на `catch (e) { logSilent('saveDraftToStorage', e) }`.
- **Effort:** S
- **Verification needed?** No

---

## Roadmap

### This sprint (block-3 hot fixes — Security + low-risk wins)

- **F-01** (S) — Закрыть `/api/debug/pananames` middleware'ом auth + убрать `signaturePreview`, либо удалить ручку.
- **F-02** (S) — Заменить `VITE_ENVIRONMENT === 'development'` на `import.meta.env.DEV` в обоих роутерах.
- **F-03** (S) — Добавить `meta.roles` + role-check guard в `packages/frontend/src/router/index.ts`.
- **F-04** (M) — Завернуть status-update + library-marks в единый `db.batch([...])` для approve-flow.
- **F-14** (S) — Дебаунс `saveDraftToStorage` 500ms.
- **F-17** (S) — `brands.delete('/:id')` → один `db.batch([...])`.
- **F-20** (S) — Заменить silent `catch {}` на `logSilent(...)`.

### Next sprint (Architecture refactor — staged decomposition)

- **F-06** (XL, разбить на 3 PR) —
  - PR-1: удалить `v-else` legacy блок (после ✅ ручной проверки `rejected` view).
  - PR-2: вынести inline SVG в icon-set / один `<SummaryIcon>`.
  - PR-3: вынести PDF-builder в `usePrintBrandData`.
- **F-11** (L) — Унификация footer'ов + `<SelectionStepLayout>` для po-edit / ceo-reselect.
- **F-12** (S) — Переписать `saveBrand` и сетевой код composable'ов на `apiGet/apiPut/apiPost`.
- **F-13** (M) — `useLibrariesStore` с TTL-кэшем для справочников; убрать дубль-фетчи в Step10.
- **F-16** (M) — Замена `z.any()` на полноценные схемы briefs/stepData в `packages/shared/src/schemas`.
- **F-18** (S) — Декларативный mapping в `brands.put('/:id')`.

### Tech-debt backlog (Large / XL, требует продуктовой подписи)

- **F-05** (L) — Миграция JWT в HttpOnly cookie (требует изменения `/api/auth/google` + CSRF механизма).
- **F-07** (L) — Декомпозиция `ConstructorLayout.vue`: вынос preview-блоков + brief-modal + transitions.
- **F-08** (XL) — Расщепление `constructor.ts` store на 5 доменных store'ов с adapter-фасадом.
- **F-09** (XL) — Расщепление `brands.ts` worker'a на 4 модуля; рефакторинг status-handler.
- **F-10** (M) — Декларативный sections-based рендерер для `slack.ts`.
- **F-15** (S) — Сузить `deep:true` watch в `BrandPreviewPanel.vue` (требует чтения файла).
- **F-19** (S) — Решение по PUT-доступу admin'ов к чужим брендам (требует подтверждения продукта).

---

## Notes & assumptions

- Findings, помеченные **⚠️ Needs verification**, требуют runtime/log check перед действием (F-02 e2e-тесты, F-05 поиск `v-html`, F-06 проверка `rejected` через legacy view, F-10 snapshot-тест Slack, F-13 timing запросов, F-15 чтение файла, F-19 продуктовая позиция).
- Аудит **не покрывает**: бизнес-логику корректности (валидность правил перехода статусов, RBAC-матрица из PRD), UI/UX дизайн качество, стратегию покрытия тестами, реальные значения метрик (TTI/LCP — нужен Lighthouse run), runtime-поведение worker'а (квоты, latency).
- Бандл-размеры из задания (`vfs_fonts ≈ 855kB`, `pdfmake ≈ 1MB`, `Step10 ≈ 130kB`) **не подтверждены** — в коде pdfmake лениво грузится через `await import(...)` внутри `downloadPdf()` (`usePrintBrand.ts:284-285`), что архитектурно правильно. Если бандл показывает обратное — нужен анализ Vite output (`packages/constructor/dist/stats.html` или `rollup-plugin-visualizer`).
- Все SQL-запросы worker'а — параметризованы через D1 `.prepare().bind()`. SQL-инъекций в проверенных файлах (`brands.ts`, `namings.ts`, `index.ts`) **не обнаружено**. Замечание задания об «SQL injection via string concatenation» — не подтверждено.
- Worker уже выставляет `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, базовый CSP (`packages/worker/src/index.ts:22-37`). CORS — origin whitelist через env. Эти контролы можно считать здоровыми.
- Use of `: any` / `@ts-ignore` в коде — отсутствует; единственное появление `any` — это 6 × `z.any()` в `brands.ts` (см. F-16). TypeScript-discipline в проекте на хорошем уровне.
