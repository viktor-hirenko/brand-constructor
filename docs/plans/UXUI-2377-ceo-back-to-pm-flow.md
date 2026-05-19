# UXUI-2377. Brand Builder — CEO back to PM flow

**Jira-задача**: `UXUI-2377` — Brand Builder. CEO back to PM flow
**Figma flow**: [`1958:657`](https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=1958-657&m=dev)
**Гілка інтеграції**: `feature/ceo-back-to-pm-flow`
**Документ створено**: 2026-05-19
**Останнє оновлення**: 2026-05-19
**Версія документа**: v1.1
**Статус**: 🟡 Active — Stage 1 завершено, очікую підтвердження для Stage 2

---

## 1. Контекст

### 1.1 Що вже зроблено (НЕ чіпаємо)

Раніше реалізована **CEO-side частина** flow (макети [`1443:2328`](https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=1443-2328&m=dev) та [`1443:11607`](https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=1443-11607&m=dev)):

- `views/ceo-reselect/CeoReselectConceptStep.vue`
- `views/ceo-reselect/CeoReselectExternalNamingStep.vue`
- `views/ceo-reselect/CeoReselectInternalNamingStep.vue`
- `components/constructor/ceo-reselect/*` (ConceptGrid, ExternalNamingGrid, InternalNamingGrid, CustomerPickPreview, CustomerNamingsRow, CeoReselectFooter)
- Worker endpoint `PATCH /api/brands/:id/ceo-selections` (`packages/worker/src/routes/brands.ts:662`)
- Store actions `ceoReselectDraft`, `saveCeoSelections`, `seedCeoReselectFromBrand`
- `CeoActionsFooter.vue` з валідацією `validateNeedsRevision()` (CEO має додати коментар, якщо обрав альтернативу)

**Цю частину не торкаємо.** Тільки доповнюємо.

### 1.2 Що робимо в цій задачі

Реалізуємо **PO-side частину** — те, що бачить Product Owner, коли бриф повернувся зі статусом `needs_revision` (макет [`1958:657`](https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=1958-657&m=dev)).

**Скоуп — рівно те, що в макеті `1958:657`:**

1. Product view (returned from CEO) — новий layout для PO в `needs_revision`.
2. Resolve / Unresolve CEO коментарів.
3. Apply CEO variant (concept / external naming / internal naming) — кнопка-в-один-клік.
4. PO edit flows — окремі edit-екрани для Concept / External Naming / Internal Naming + chained-from-concept.
5. Post-apply edit flows — окремі edit-екрани після того, як PO застосував CEO variant.
6. 2 dependency-guard модалки.
7. Глобальне візуальне оновлення `ReviewSection` (BG/stroke/radius).

### 1.3 Out-of-scope

- Будь-які зміни в CEO-side flow (`ceo-reselect/*`).
- Зміни в admin-panel (`packages/frontend`).
- Slack notification refactor (працює як зараз).
- Worker schema migrations крім міграції-на-льоту для `ceo_comments`.
- Confluence / Jira інтеграції.

---

## 2. Карта Figma-нод

| Node ID | Назва | Що це | Призначення |
| --- | --- | --- | --- |
| `1958:657` | UXUI-2377 root section | Канвас зі всім флоу | Огляд |
| `1958:3720` | Product view (returned from CEO) section | Returned-view + apply demo | Stage 4 |
| `1973:7884` | PO view (returned) | Основний layout returned-view | Stage 4 |
| `1973:1671` | Section card spec | BG/stroke/radius update | Stage 2 |
| `1566:31493` | Comment component | 5 state'ів (включно з Unresolved/Resolved) | Stage 3 |
| `1981:6255` | Segmented control | Reusable `Світла/Темна тема` | Stage 4 / Stage 7 |
| `1979:1533` | Resolving CEO comment section | 3 state'и (Unresolved → Resolved → Hover) | Stage 3 |
| `1979:1363` | Unresolved comment | Initial state з blue indicator | Stage 3 |
| `1979:1409` | Resolved comment | Button "Вирішено" | Stage 3 |
| `1979:1454` | Resolved comment / Button hovered | Hover показує "Повернути" | Stage 3 |
| `1981:2889` | Concept & External Naming / Edit section | Container | Stage 7 |
| `1981:5558` | Edit Concept | Edit Concept (PO previous + CEO pick) | Stage 7 |
| `1981:5969` | Edit External Naming (chained) | БЕЗ PO previous, тільки CEO + alt | Stage 7 |
| `1981:5247` | Edit External Naming (standalone) | З PO previous + CEO + alt | Stage 7 |
| `1981:6378` | Edit External Naming (з comment-overwrite hint) | Правило заміни старого коментаря | Stage 7 |
| `1981:7121` | Edit Internal Naming | PO previous + CEO + alt | Stage 7 |
| `1985:2573` | Apply CEO Changes section | Container з усіма post-apply станами | Stage 5 / 8 |
| `1985:2188` | PO view after concept apply | Single card + label "Обраний концепт" | Stage 5 |
| `1985:1527` | Post-apply edit / Select Concept | Single applied + alternatives grid | Stage 8 |
| `1985:3356` | Post-apply edit / Select External Naming | Single applied + alt grid | Stage 8 |
| `1985:4010` | Post-apply edit / Select Internal Naming | Single applied + alt grid | Stage 8 |
| `1985:4362` | Modal — Apply CEO ext naming before concept | "Застосувати варіант CEO?" | Stage 6 |
| `1985:4657` | Modal — Edit External Naming before concept resolved | "Потрібно обрати концепт" | Stage 6 |

**Раніше реалізовано (не чіпаємо):**

| Node ID | Назва |
| --- | --- |
| `1443:2328` | CEO reselect flow — full overview |
| `1443:11607` | CEO submitted view — full canvas |

---

## 3. Бізнес-правила

### 3.1 Загальна логіка (підтверджено замовником, **дослівно**)

> У банері зверху відображається кількість секцій, в яких є:
> - невирішені коментарі CEO
> - або незастосовані зміни (concept / naming)
>
> Банер зникає, коли коменти та зміни у всіх секціях вирішені.
>
> Секція вважається "потребує уваги", якщо:
> - є коментар CEO зі статусом "не вирішено"
> - або є зміни від CEO, які ще не застосовані (concept / naming)
>
> Кнопка "На погодження CEO" (внизу) **disabled**, якщо:
> - є хоча б одна секція, що потребує уваги
>
> Загальний коментар CEO (внизу):
> - не має статусу "(не)вирішено"
> - не впливає на банер
> - не впливає на стан кнопки "На погодження CEO"

### 3.2 Індикатори у header секції

У header кожної секції в returned-view може бути **один із двох індикаторів** (або жоден):

1. **Малий ellipse 6×6** (синя крапка) — коли в секції є **хоча б один unresolved CEO-коментар**, **але** жодних незастосованих CEO-варіантів.
2. **Бейдж з іконкою + текст `Потрібно обрати варіант`** — коли CEO запропонував альтернативу в секції (`brandCeoSelections[section] !== stepData.<section>`), і PO ще не застосував її і не змінив свій вибір.

Якщо в секції одночасно є **і** unresolved-коментар, **і** undecided-варіант — показуємо тільки бейдж `Потрібно обрати варіант` (він важливіший, бо блокує submit і так).

### 3.3 Resolve / Unresolve CEO коментарів

- Coment-стейт `unresolved`: блакитний лівий border 4px + кнопка `Позначити як вирішений` всередині.
- Coment-стейт `resolved`: без border + кнопка `Вирішено` з галкою.
- Hover на `Вирішено` → кнопка змінюється на `Повернути` (state `Resolved / Button hovered`, node `1979:1454`).
- Resolve / unresolve дозволено тільки автору брифа (`brand.created_by === user.id`) і тільки коли `brand.status === 'needs_revision'`.
- При `needs_revision → submitted` resubmit worker **очищає** `ceo_comments` повністю (поточна поведінка, не змінюємо).
- Загальний коментар CEO (sectionKey === 'general') **не має** resolve-стану — він просто read-only для PO.

### 3.4 Apply CEO variant

- Кнопка `Застосувати варіант CEO` показується **тільки** в секціях `concept`, `externalNaming`, `internalNaming` і тільки коли `isCeoChoiceAnAlternative(section)` === true.
- Після кліку:
  - `stepData.<section>` ← значення з `brandCeoSelections[section]`.
  - Бейдж `Потрібно обрати варіант` зникає.
  - Лейбли блоків змінюються:
    - Concept: `Вибір замовника / Вибір CEO` → `Обраний концепт`.
    - External Naming: `Вибір замовника / Вибір CEO` → `Обрані назви`.
    - Internal Naming: → `Обрана назва`.
  - Dual-view → single-view (показуємо тільки обраний варіант).
- **Залежність concept ↔ external naming**: якщо PO застосовує CEO concept, але `stepData.externalNaming.selectedIds` мають хоча б один namings, у якого `concept_id !== newConceptId` — ці namings **очищаються**, секція External Naming повертається в стан "потребує уваги" (тобто треба обрати наново).
- `brandCeoSelections` **не очищаємо** при apply — лишаємо для аудиту того, що CEO пропонував.
- Flag "applied" обчислюється runtime: `applied = (stepData.<section>.id === brandCeoSelections.<section>[0])`. Не зберігаємо окремо.

### 3.5 Edit-flow (PO Edit)

#### 3.5.1 Click `Редагувати` на секції Concept

Відкривається **Edit Concept** view (`1981:5558`):
- Top: side-by-side `Ваш попередній вибір` (PO original) + `Вибір CEO` (CEO pick, pre-selected з галкою).
- Mid: divider.
- Below: `Інші концепти` + `SegmentedControl` (Світла/Темна тема) + grid alternatives (без PO original, без CEO pick).
- Footer: `Скасувати` / `Далі`.

Click `Далі`:
- **Якщо concept НЕ змінився** (selected = PO original): закриваємо view, повертаємо в Product returned-view.
- **Якщо concept ЗМІНИВСЯ** (selected = CEO pick or other library option): автоматично відкриваємо **Edit External Naming (chained)** з пустим `selectedIds`.

#### 3.5.2 Edit External Naming (chained, після зміни concept) — `1981:5969`

- БЕЗ блоку `Ваш попередній вибір` (старі імена належали іншому концепту).
- `Вибір CEO` — показуємо **тільки** якщо `brandCeoSelections.externalNaming` ідентифікатори мають `concept_id === newConceptId` (тобто сумісні з новим концептом). Інакше — block прихований.
- `Інші назви для обраного концепту` — grid фільтрований за новим `concept_id`.
- Comment field — collapsed.
- Footer: `Назад` / `Зберегти` (disabled поки не зроблено вибір).

#### 3.5.3 Edit External Naming (standalone, concept не змінювався) — `1981:5247`

- `Ваш попередній вибір` — список PO `selectedIds`.
- `Вибір CEO` — `brandCeoSelections.externalNaming`.
- `Інші назви для обраного концепту` — grid.
- Footer: `Скасувати` / `Зберегти`.

#### 3.5.4 Edit Internal Naming — `1981:7121`

- `Ваш попередній вибір` — PO `selectedId`.
- `Вибір CEO` — `brandCeoSelections.internalNaming` (pre-selected з галкою).
- `Інші внутрішні назви` — grid alternatives.
- Footer: `Скасувати` / `Зберегти`.

#### 3.5.5 Правило заміни коментаря — `1981:6378`

> Якщо замовник під час редагування концепту чи назви залишає тут коментар — текст його старого коментаря (якщо він був) змінюється новим.

Реалізація: edit-view має collapsible comment field. На `Зберегти` нове значення повністю замінює `stepData.<section>.comment`. На `Скасувати` — відновлюємо snapshot.

### 3.6 Post-apply edit

Якщо PO **застосував** CEO variant і потім натиснув `Редагувати`, відкривається **інший** view (`1985:1527` / `1985:3356` / `1985:4010`):

- Заголовок секції залишається стандартним (наприклад "Concept Selection").
- Top: один блок `Обраний концепт` (single card з галкою) — це той самий applied variant.
- Below: `Доступні концепти` + segmented + grid **усіх** доступних альтернатив (включно з PO original, який тепер просто rapped в grid без спеціального статусу).
- Footer: `Скасувати` / `Далі` (для concept) або `Зберегти` (для external/internal).

Логіка: PO може передумати і вибрати інший concept (включно з власним попереднім), а далі — chained flow або просто save.

### 3.7 Dependency-guard модалки

#### 3.7.1 Modal "Застосувати варіант CEO?" — `1985:4362`

**Тригер**: PO натискає `Застосувати варіант CEO` в External Naming секції, **і** в секції Concept ще є undecided CEO alternative.

**Текст**:
- Title: `Застосувати варіант CEO?`
- Body: `Ці назви прив'язані до іншого концепту. Разом із ними буде застосовано концепт обраний СЕО.`
- Actions: `Скасувати` (secondary) / `Застосувати все` (primary dark).

**Поведінка `Застосувати все`**: atomic apply і concept, і external naming в одну операцію (одне `PUT /api/brands/:id`).

#### 3.7.2 Modal "Потрібно обрати концепт" — `1985:4657`

**Тригер**: PO натискає `Редагувати` в External Naming секції, **і** в секції Concept ще є undecided CEO alternative.

**Текст**:
- Title: `Потрібно обрати концепт`
- Body: `Щоб редагувати назви, спочатку оберіть концепт. Застосуйте варіант СЕО або оберіть інший.`
- Actions: `Скасувати` (secondary) / `Редагувати концепт` (primary dark).

**Поведінка `Редагувати концепт`**: redirect на `PoEditConcept` view.

### 3.8 Гейтинг submit-кнопки

- Кнопка `На погодження CEO` (у footer returned-view) — **disabled** (hard-block) поки `attentionCounter > 0`.
- `attentionCounter` = кількість секцій, де `hasUnresolvedCeoComment(section)` АБО `hasUndecidedCeoAlternative(section)`.
- Загальний коментар CEO у counter НЕ враховується.

### 3.9 Status transitions

Без змін: `needs_revision → submitted` → worker очищає `ceo_comments` і `ceo_selections`. Slack notification — `buildResubmittedMessage`.

---

## 4. Data Model

### 4.1 Shared types (`packages/shared/src/types/brand.ts`)

```ts
export interface CeoCommentMeta {
  value: string
  resolved: boolean
  resolvedAt: string | null
}

export type BrandCeoComments = Record<string, CeoCommentMeta>

// у Brand:
ceoComments: BrandCeoComments | null
```

Legacy `Record<string, string>` мігрується на льоту в worker `rowToBrand`:
```ts
{ [key]: typeof value === 'string'
    ? { value, resolved: false, resolvedAt: null }
    : value }
```

Окремий flag `appliedCeoVariants` **не зберігаємо** — обчислюємо runtime.

### 4.2 Worker schema

DB-міграції не потрібні: `ceo_comments` лишається `TEXT` (JSON). Тільки accept-on-read міграція в `rowToBrand`.

### 4.3 Worker API contract

#### Існуючі (без змін):
- `GET /api/brands/:id`
- `PUT /api/brands/:id`
- `PATCH /api/brands/:id/status`
- `PATCH /api/brands/:id/ceo-selections`

#### Новий endpoint:

```http
PATCH /api/brands/:id/ceo-comments/resolve
Content-Type: application/json
Authorization: Bearer <jwt>

{
  "section": "concept" | "externalNaming" | "internalNaming" | "basics" | "marketingPackage" | "deliverables" | "visualComponents",
  "resolved": true | false
}
```

**Validation**:
- `req.user.id === brand.created_by` (тільки автор).
- `brand.status === 'needs_revision'`.
- `section` має існувати в `ceo_comments`.

**Response**: `{ success: true, data: <Brand> }` (повний оновлений brand).

**Side effects**: `brands.updated_at = now()`, `ceo_comments[section].resolved = resolved`, `ceo_comments[section].resolvedAt = resolved ? now() : null`.

### 4.4 Pinia store actions

Додати в `useConstructorStore`:
- `setCeoCommentResolved(sectionKey: string, resolved: boolean): Promise<boolean>` — викликає новий PATCH endpoint.
- `applyCeoVariant(section: 'concept' | 'externalNaming' | 'internalNaming'): Promise<boolean>` — застосовує + PUT brand.
- `applyCeoConceptAndExternalAtomic(): Promise<boolean>` — atomic для модалки.
- `startPoEdit(section: 'concept' | 'externalNaming' | 'internalNaming', mode: 'choice' | 'post-apply'): void` — captures snapshot, navigates.
- `commitPoEdit() / cancelPoEdit()` — паралель до існуючих `commitEditSection / cancelEditSection`.

Додати computed:
- `attentionCounter: number`
- `submitBlocked: boolean` (= `attentionCounter > 0`)
- `unresolvedSections: Set<string>`
- `undecidedSections: Set<string>`
- `hasConceptMismatch: boolean`

---

## 5. Component / UI plan

### 5.1 Нові компоненти

| Файл | Призначення |
| --- | --- |
| `components/ui/SegmentedControl.vue` | Reuse з Figma `1981:6255`. Прокидаємо `options`, `modelValue`. |
| `components/ui/SectionStatusBadge.vue` | Бейдж `Потрібно обрати варіант` / `Обраний концепт` / `Обрані назви` / `Обрана назва` (4 варіанти через prop `variant`). |
| `components/ui/UnresolvedDot.vue` | 6×6 синій ellipse. |
| `components/constructor/review/CeoCommentCard.vue` | Comment-card з 2 state'ами `unresolved` / `resolved` + кнопки + hover. |
| `components/constructor/review/ReturnedFromCeoBanner.vue` | Інфо-банер з counter "N секцій потребують уваги". |
| `components/constructor/review/ApplyCeoVariantButton.vue` | Full-width outlined button з emit `apply`. |
| `components/constructor/review/ApplyCeoBeforeConceptModal.vue` | Modal `1985:4362`. |
| `components/constructor/review/EditExternalBeforeConceptModal.vue` | Modal `1985:4657`. |
| `components/constructor/po-edit/PoEditFooter.vue` | Footer `Скасувати/Далі` / `Скасувати/Зберегти` / `Назад/Зберегти` (props-driven). |
| `views/po-edit/PoEditConceptView.vue` | Edit Concept (`1981:5558` + `1985:1527`). Має `mode: 'choice' \| 'post-apply'`. |
| `views/po-edit/PoEditExternalNamingView.vue` | Edit External (`1981:5969` + `1981:5247` + `1985:3356`). Має `mode: 'chained' \| 'standalone' \| 'post-apply'`. |
| `views/po-edit/PoEditInternalNamingView.vue` | Edit Internal (`1981:7121` + `1985:4010`). Має `mode: 'choice' \| 'post-apply'`. |

### 5.2 Модифікація існуючих

| Файл | Зміни |
| --- | --- |
| `components/constructor/review/ReviewSection.vue` | (1) Глобальні стилі: `bg-white`, `border-[#EDEDED]`, `rounded-2xl`. (2) Нові props: `unresolved: boolean`, `statusBadge: 'attention' \| 'concept-applied' \| 'external-applied' \| 'internal-applied' \| undefined`, `applyCeo: boolean`. (3) Emits: `apply-ceo`. |
| `components/constructor/review/ReviewConceptBlock.vue` | Додати prop `mode: 'po-only' \| 'dual' \| 'applied'`. У `applied` — single card з overlaid checkmark, label "Обраний концепт". |
| `components/constructor/review/ReviewExternalNamingsList.vue` | Те ж саме + `applied` label "Обрані назви". |
| `components/constructor/review/ReviewInternalNamingBlock.vue` | Те ж саме + `applied` label "Обрана назва". |
| `components/constructor/SectionCommentBlock.vue` | Інтегрувати `CeoCommentCard.vue`. Додати props: `resolved`, `canResolve`, emit `resolve` / `unresolve`. |
| `views/steps/Step10ReviewSubmit.vue` | (1) Ввести `reviewMode === 'po-returned'`. (2) Використати `ReturnedFromCeoBanner`. (3) Гейтинг `На погодження CEO` через `submitBlocked`. (4) Підключити модалки + ApplyCeoVariantButton + редирект на PoEdit*. (5) Зберегти legacy `v-else` до Stage 9, потім видалити. |
| `stores/constructor.ts` | Додати методи з §4.4 + computed з §4.4. |
| `router/index.ts` | Додати маршрути: `/constructor/brand/:id/po-edit/{concept, concept/external-naming, external-naming, internal-naming}` + гард `poEditGuard`. |
| `composables/usePrintBrand.ts` | Адаптувати до нового формату `BrandCeoComments` (читаємо `.value`). |
| `worker/src/routes/brands.ts` | (1) `rowToBrand` міграція. (2) Розширити Zod схеми (`updateStatusSchema.ceoComments`). (3) Новий endpoint `PATCH /:id/ceo-comments/resolve`. |
| `worker/src/utils/slack.ts` | (Опціонально) — оновити `buildNeedsRevisionMessage` якщо передається новий формат `ceoComments`. |

---

## 6. План стадій

### Stage 0 — Audit & план-документ ✅
- [x] Прочитати макети Figma.
- [x] Прочитати поточний код проекту.
- [x] Прочитати `IMPLEMENTATION-PLAN.md`, `FLOW-AND-NOTIFICATIONS-ANALYSIS.md`.
- [x] Створити цей план-документ.
- [ ] Підтвердити план з замовником.

### Stage 1 — Data model + API contract ✅ (1 день)

**Гілка**: `feat/ceo-comments-meta-type` (не створено окремо, реалізовано локально)
**Виконано**: 2026-05-19
**Реальний час**: ~45 хв (план — 1 день)

**Discovery (виконано)**:
- [x] Прочитати `usePrintBrand.ts` повністю.
- [x] Перевірити всі місця, де `ceoComments` зараз обробляється: 5 точок у `Step10ReviewSubmit.vue` (lines 426, 553, 705, 1056, 1440), 1 у `router/index.ts:154`, 2 функції в `worker/utils/slack.ts` (lines 75, 130, 326, 332), 1 в `brands.ts` row-parsing.
- [x] Перевірити, чи десь є тести — **немає** unit-тестів (vitest/jest відсутні в `packages/*/package.json`).

**Discovery deltas** (новий розділ — додано при виконанні):
- ✅ `usePrintBrand.ts` приймає `Record<string, string>` як параметр — НЕ потребує адаптації. Замість цього flatten зроблено в Step10 через `flattenCeoCommentsForPdf()`.
- ✅ `slack.ts` `buildNeedsRevisionMessage` приймає `Record<string, string>` — НЕ потребує адаптації. Worker `collectBrandNotificationData` flatten'ить новий формат у плоский (через `flattenCeoCommentsToValues`).
- ✅ Шаблон Step10 line 1440 `v-for="(comment, key) in store.brandCeoComments"` адаптовано: тепер `comment.value`.
- ⚠️ `pnpm lint` НЕ запускається — `eslint: command not found` (не встановлено в node_modules). Це pre-existing issue, не пов'язане зі змінами. **Type-check (`vue-tsc + tsc`) проходить на всіх 4 пакетах**.
- ⚠️ `setCeoCommentValue` тепер скидає `resolved: false` коли значення коментаря **змінюється** (нова семантика — переписаний коментар вже не може бути позначеним як resolved старим actio'м CEO). Якщо текст ідентичний — `resolved` зберігається.

**Files to touch (виконано)**:
- [x] `packages/shared/src/types/brand.ts`
- [x] `packages/shared/src/types/index.ts` (експорти `CeoCommentMeta`, `BrandCeoComments`, `UpdateCeoCommentResolvedPayload`)
- [x] `packages/worker/src/routes/brands.ts`
- [x] `packages/constructor/src/stores/constructor.ts`
- [x] `packages/constructor/src/views/steps/Step10ReviewSubmit.vue` (read-only адаптація)

**Checklist (виконано)**:
- [x] Створити `CeoCommentMeta` тип у `shared/src/types/brand.ts`.
- [x] Експортувати `BrandCeoComments` як `Record<string, CeoCommentMeta>`.
- [x] Worker `rowToBrand` → використовує `parseCeoCommentsFromRow()` для legacy migration.
- [x] Worker — оновлено Zod `updateStatusSchema.ceoComments` (union string | meta) + `ceoCommentMetaSchema`.
- [x] Worker — новий endpoint `PATCH /:id/ceo-comments/resolve` + Zod schema + role/status guards + section whitelist (`RESOLVABLE_SECTION_KEYS`).
- [x] Worker — `normaliseCeoCommentsForStorage()` нормалізує на запис у `PATCH /:id/status`.
- [x] Store — оновлено тип `brandCeoComments`, `setCeoCommentValue` (з resolve-invalidation logic), `loadBrand` приймає новий тип.
- [x] Store — додано `setCeoCommentResolved(sectionKey, resolved)` action з optimistic update + rollback + per-section loading map.
- [x] Adapt `Step10ReviewSubmit.vue` — 5 точок read-only адаптації + helper `flattenCeoCommentsForPdf()`.
- [x] Adapt worker `collectBrandNotificationData` — flatten для slack.
- [x] Type-check проходить (`pnpm type-check`).
- [ ] ~~Lint~~ — eslint не встановлено в проекті (pre-existing).

**Acceptance (для manual QA, ПІСЛЯ старту проекту)**:
- Існуючий бриф у `needs_revision` зі старим `ceo_comments` форматом — відкривається без помилок (migration on read).
- Нові коментарі CEO зберігаються у форматі `{value, resolved: false, resolvedAt: null}`.
- UI не змінився візуально.
- `PATCH /:id/ceo-comments/resolve` працює і повертає `200 + updated Brand`.
- PDF export працює (читає flatten'ені коментарі).

**Manual checks (до запуску Stage 2)**:
- [ ] `pnpm dev:worker` + `pnpm dev:constructor`, перевірити що сторінки відкриваються.
- [ ] CEO відправляє бриф на `needs_revision` з коментарем → перевірити в DB що `ceo_comments[concept] = {value, resolved: false, resolvedAt: null}`.
- [ ] PO відкриває цей бриф → коментар читається у read-only вигляді (yellow legacy banner поки що).
- [ ] `curl -X PATCH .../ceo-comments/resolve -d '{"section":"concept","resolved":true}'` → 200.
- [ ] Те ж саме як non-owner → 403.
- [ ] Те ж саме якщо `status === 'submitted'` → 400.

**Estimated**: 1 day ➜ **Actual**: ~45 хв (швидше — менше місць використання, ніж очікувалось)

---

### Stage 2 — Section card visual update (0.5 дня)

**Гілка**: `feat/section-card-visual-update`

**Discovery**:
- [ ] Перевірити, чи `ReviewSection` використовується десь крім Step10 (admin-panel `packages/frontend/...`? — ні, не використовується, але переконатись).
- [ ] Перевірити `tailwind.config.js` або CSS-vars в `packages/constructor/src/styles/` — чи є `--color-section-bg` тощо.

**Files to touch**:
- `packages/constructor/src/components/constructor/review/ReviewSection.vue`

**Checklist**:
- [ ] Змінити `bg-[#f3f3f5]` → `bg-white`.
- [ ] Змінити `border-black/10` → `border-[#EDEDED]`.
- [ ] Змінити `rounded-xl` → `rounded-2xl`.
- [ ] Перевірити `highlighted` state (амбер ring) — все ще валідний.
- [ ] Скріншот diff в трьох режимах: PO-draft, CEO-finalize, PO-needs_revision.

**Acceptance**:
- Section card у всіх 3 режимах має новий вигляд.
- Жоден з інших режимів не зламався.

**Manual checks**:
- [ ] Відкрити Step10 в трьох ролях/станах. Скріншоти.

**Estimated**: 0.5 day

---

### Stage 3 — Resolving CEO comments UI (1.5 дня)

**Гілка**: `feat/ceo-comments-resolve-ui`

**Discovery**:
- [ ] Подивитися як hover-стан кнопки `Вирішено → Повернути` в Figma реалізовано (node `1979:1454`) — який точно icon і transition.
- [ ] Перевірити accessibility (фокус, клавіатура).

**Files to touch**:
- `packages/constructor/src/components/constructor/review/CeoCommentCard.vue` (НОВИЙ)
- `packages/constructor/src/components/constructor/SectionCommentBlock.vue`
- `packages/constructor/src/components/constructor/review/ReviewSection.vue` (додати `unresolved` prop + dot)
- `packages/constructor/src/components/ui/UnresolvedDot.vue` (НОВИЙ)
- `packages/constructor/src/views/steps/Step10ReviewSubmit.vue` (wire up resolve handlers)
- `packages/constructor/src/stores/constructor.ts` (`setCeoCommentResolved` action)

**Checklist**:
- [ ] Створити `UnresolvedDot.vue`.
- [ ] Створити `CeoCommentCard.vue` з 2 state'ами + hover.
- [ ] Refactor `SectionCommentBlock.vue` — використати `CeoCommentCard` для read-only CEO state в `needs_revision`.
- [ ] `ReviewSection.vue` — додати prop `unresolved` і рендерити `UnresolvedDot` в header.
- [ ] Store action `setCeoCommentResolved(sectionKey, resolved)` — оптимістично оновлює локально + PATCH.
- [ ] Race condition: блокувати кнопку resolve поки відбувається запит.
- [ ] `Step10ReviewSubmit.vue` — обчислювати `unresolvedSections` set, прокидати в кожний `ReviewSection`.
- [ ] Лінт + тайпчек.

**Acceptance**:
- Figma `1979:1363 / 1409 / 1454` відтворений pixel-close.
- PO може Resolve → бачить `Вирішено` → hover → бачить `Повернути` → клік → знову `unresolved`.
- DB зберігає `resolved: true/false` + `resolvedAt`.
- Resubmit очищає всі коментарі (з resolved=false теж).

**Manual checks**:
- [ ] Resolve коментар → перезавантажити сторінку → стан зберігся.
- [ ] Unresolve коментар → стан зберігся.
- [ ] Resubmit → відкрити CEO view → коментарів нема (очищено).
- [ ] Спробувати resolve як CEO (не creator) — отримати 403.

**Estimated**: 1.5 day

---

### Stage 4 — Returned-from-CEO view + counter + submit gating (1 день)

**Гілка**: `feat/returned-from-ceo-view`

**Discovery**:
- [ ] Уточнити з PM: точний текст info-banner ("4 секції потребують уваги" + "Перегляньте коментарі та зміни від СЕО і оновіть бриф перед повторною відправкою.") — копія з Figma.
- [ ] Перевірити, чи `BrandPreviewPanel.vue` коректно рендерить applied state.

**Files to touch**:
- `packages/constructor/src/components/constructor/review/ReturnedFromCeoBanner.vue` (НОВИЙ)
- `packages/constructor/src/components/ui/SectionStatusBadge.vue` (НОВИЙ — поки тільки `attention` variant)
- `packages/constructor/src/components/constructor/review/PoActionsFooter.vue` (додати `disabled` prop, новий submit label)
- `packages/constructor/src/views/steps/Step10ReviewSubmit.vue`
- `packages/constructor/src/stores/constructor.ts` (computed `attentionCounter`, `submitBlocked`)

**Checklist**:
- [ ] Створити `ReturnedFromCeoBanner.vue` з warning icon + counter + opisом.
- [ ] Створити `SectionStatusBadge.vue` (поки тільки `attention` variant з текстом "Потрібно обрати варіант").
- [ ] `Step10ReviewSubmit.vue` — ввести `reviewMode === 'po-returned'` для `!isCeoView && status === 'needs_revision'`.
- [ ] Включити `unifiedReviewLayout` для нового режиму.
- [ ] Замінити старий ReviewHeader info-block на `ReturnedFromCeoBanner` для returned-режиму.
- [ ] Store: computed `attentionCounter`, `submitBlocked`, `undecidedSections`.
- [ ] `PoActionsFooter.vue` — додати `disabled: boolean` prop. Label `На погодження CEO` для returned-режиму.
- [ ] Прокинути `submitBlocked` в footer.
- [ ] Перевірити, що `ReviewSection` отримує бейдж `Потрібно обрати варіант` для секцій з undecided CEO variant.

**Acceptance**:
- Figma `1973:7884` відтворено (без apply logic + edit views).
- Counter оновлюється реактивно при resolve коментарів.
- Кнопка submit фізично disabled поки counter > 0.

**Manual checks**:
- [ ] Відкрити returned-бриф з 4 секціями attention → counter = 4.
- [ ] Resolve один коментар → counter = 3.
- [ ] Спробувати клікнути submit при counter > 0 → нічого не відбувається.
- [ ] Coли counter = 0 → кнопка активна, submit працює.

**Estimated**: 1 day

---

### Stage 5 — Apply CEO variant (без модалок) (1.5 дня)

**Гілка**: `feat/apply-ceo-variant`

**Discovery**:
- [ ] Перевірити, як зараз PUT brand зберігає `stepData.<section>` — переконатись, що наш `applyCeoVariant` не зламає кеш.
- [ ] Перевірити validatey concept→external naming compatibility (worker endpoint фільтрує namings за `concept_id`).

**Files to touch**:
- `packages/constructor/src/components/constructor/review/ApplyCeoVariantButton.vue` (НОВИЙ)
- `packages/constructor/src/components/constructor/review/ReviewSection.vue` (slot `apply-action`, prop `applyCeo`)
- `packages/constructor/src/components/constructor/review/ReviewConceptBlock.vue` (mode prop)
- `packages/constructor/src/components/constructor/review/ReviewExternalNamingsList.vue` (mode prop)
- `packages/constructor/src/components/constructor/review/ReviewInternalNamingBlock.vue` (mode prop)
- `packages/constructor/src/components/ui/SectionStatusBadge.vue` (додати `concept-applied` / `external-applied` / `internal-applied` variants)
- `packages/constructor/src/views/steps/Step10ReviewSubmit.vue`
- `packages/constructor/src/stores/constructor.ts` (`applyCeoVariant` action)

**Checklist**:
- [ ] Створити `ApplyCeoVariantButton.vue` (повна ширина, outlined).
- [ ] `ReviewSection.vue` — додати rendering для `ApplyCeoVariantButton` у дочірньому слоті після основного блоку.
- [ ] `ReviewConceptBlock.vue` — додати mode `applied` (single card overlaid with checkmark + label "Обраний концепт").
- [ ] Те ж для External/Internal blocks.
- [ ] Розширити `SectionStatusBadge.vue` 3 нові варіанти (applied).
- [ ] Store: `applyCeoVariant(section)`:
  - Скопіювати `brandCeoSelections[section]` в `stepData.<section>`.
  - Якщо section = 'concept': перевірити совместимость external naming → очистити несумісні з `selectedIds`.
  - Викликати `saveBrand()` (звичайний PUT).
- [ ] Step10 — emit `apply-ceo` від ReviewSection обробляється через `applyCeoVariant`.
- [ ] Перевірити: після apply concept бейдж зникає, з'являється label "Обраний концепт", блок змінює layout.
- [ ] Після apply external naming — label змінюється на "Обрані назви".
- [ ] Після apply internal naming — label "Обрана назва".

**Acceptance**:
- Figma `1985:1760 → 1985:2188` транзиція працює.
- Counter падає на 1 при кожному apply.
- Після apply усіх трьох секцій (якщо CEO пропонував зміни в усіх) — counter може стати 0 (якщо коментарі resolved).

**Manual checks**:
- [ ] Apply CEO concept → external naming PO збереглись (якщо сумісні) / очистились (якщо ні).
- [ ] Apply CEO external naming → label змінився.
- [ ] Reload сторінки → applied state зберігся.

**Estimated**: 1.5 day

---

### Stage 6 — Dependency-guard модалки (0.5 дня)

**Гілка**: `feat/dependency-guard-modals`

**Discovery**:
- [ ] Перевірити, чи в проекті є модальна обгортка (`ConceptPreviewPopup.vue` має приклад). Використати той же паттерн.

**Files to touch**:
- `packages/constructor/src/components/constructor/review/ApplyCeoBeforeConceptModal.vue` (НОВИЙ)
- `packages/constructor/src/components/constructor/review/EditExternalBeforeConceptModal.vue` (НОВИЙ)
- `packages/constructor/src/views/steps/Step10ReviewSubmit.vue` (state machine для модалок)
- `packages/constructor/src/stores/constructor.ts` (`applyCeoConceptAndExternalAtomic` action)

**Checklist**:
- [ ] Створити `ApplyCeoBeforeConceptModal.vue` (Figma `1985:4362`).
- [ ] Створити `EditExternalBeforeConceptModal.vue` (Figma `1985:4657`).
- [ ] State machine в `Step10`:
  - При apply external naming → перевірити concept-mismatch → відкрити модалку.
  - При edit external naming → перевірити concept-mismatch → відкрити модалку.
- [ ] Store: `applyCeoConceptAndExternalAtomic()` — оновлює одночасно і `stepData.concept.selectedId`, і `stepData.externalNaming.selectedIds`, один PUT.
- [ ] Модалка "Редагувати концепт" → router push до `PoEditConceptView` (тимчасово зробити placeholder route в Stage 6, повну реалізацію — Stage 7).

**Acceptance**:
- Модалки з'являються рівно в тих умовах, що в макетах.
- "Застосувати все" робить одну атомарну PUT-операцію.
- "Скасувати" не змінює нічого.

**Manual checks**:
- [ ] CEO предлагает і concept, і external naming → PO в returned-view → клік на "Apply CEO" в external → модалка → "Застосувати все" → обидві секції applied одночасно.
- [ ] Те ж саме але "Скасувати" → нічого не змінилось.
- [ ] Клік "Редагувати" в external без concept apply → модалка → "Редагувати концепт" → відкрилась PoEditConcept (заглушка ОК).

**Estimated**: 0.5 day

---

### Stage 7 — PO edit views (Concept / External chained / External standalone / Internal) (2 дні)

**Гілка**: `feat/po-edit-views`

**Discovery**:
- [ ] Прочитати `CeoReselectConceptStep.vue` детально — там багато логіки, яку можна переюзати.
- [ ] Подумати чи робити окремі views для concept/external/internal або один універсальний.
- [ ] Перевірити поведінку `BrandPreviewPanel` у цих views.

**Files to touch**:
- `packages/constructor/src/views/po-edit/PoEditConceptView.vue` (НОВИЙ)
- `packages/constructor/src/views/po-edit/PoEditExternalNamingView.vue` (НОВИЙ)
- `packages/constructor/src/views/po-edit/PoEditInternalNamingView.vue` (НОВИЙ)
- `packages/constructor/src/components/constructor/po-edit/PoEditFooter.vue` (НОВИЙ)
- `packages/constructor/src/components/constructor/po-edit/PoEditDualHeader.vue` (НОВИЙ — для PO-previous + CEO-pick card pair)
- `packages/constructor/src/router/index.ts` (нові маршрути + `poEditGuard`)
- `packages/constructor/src/stores/constructor.ts` (`startPoEdit`, `commitPoEdit`, `cancelPoEdit`, `poEditDraft` state)
- `packages/constructor/src/views/steps/Step10ReviewSubmit.vue` (`Редагувати` → router push)

**Checklist**:
- [ ] Нові маршрути:
  - `/constructor/brand/:id/po-edit/concept`
  - `/constructor/brand/:id/po-edit/concept/external-naming` (chained)
  - `/constructor/brand/:id/po-edit/external-naming` (standalone)
  - `/constructor/brand/:id/po-edit/internal-naming`
- [ ] `poEditGuard`: `auth.userId === brand.created_by && status === 'needs_revision'`.
- [ ] `PoEditFooter.vue` з props `cancelLabel`, `primaryLabel`, `primaryDisabled`.
- [ ] `PoEditDualHeader.vue` — рендерить пару card "Ваш попередній вибір" + "Вибір CEO".
- [ ] `PoEditConceptView.vue`:
  - Mode `choice`: top dual header, mid divider, "Інші концепти" + segmented + grid alternatives.
  - Footer "Скасувати / Далі".
  - На Далі: якщо concept changed → push `po-edit/concept/external-naming`. Якщо same → save + back to product view.
- [ ] `PoEditExternalNamingView.vue`:
  - Mode `chained`: без PO previous, тільки CEO pick (якщо сумісний) + grid за новим concept_id. Footer "Назад / Зберегти".
  - Mode `standalone`: PO previous list + CEO pick + grid. Footer "Скасувати / Зберегти".
- [ ] `PoEditInternalNamingView.vue`: similar to Concept.
- [ ] Snapshot logic у store (`poEditDraft` — deep copy `stepData.<section>`).
- [ ] Cancel: restore snapshot. Save: `saveBrand()` + redirect back.
- [ ] Якщо в edit view PO написав comment — `stepData.<section>.comment` замінюється новим значенням. Інакше — старий збережено (snapshot не зачіпає поле, якщо не редагували).

**Acceptance**:
- Figma `1981:5558 / 1981:5969 / 1981:5247 / 1981:7121` відтворено.
- Chained-from-concept flow працює: concept changed → ext naming view з пустим selectedIds + CEO pick видно якщо сумісний.
- Comment overwrite працює.

**Manual checks**:
- [ ] З returned-view натиснути `Редагувати` на Concept без apply → відкрилось PoEditConcept.
- [ ] Змінити concept → перейшло на ExternalNaming chained.
- [ ] Зберегти → повернулось на returned-view, обидві секції оновлені.
- [ ] Скасувати в середині edit → нічого не змінилось.
- [ ] Edit External naming без зміни concept → standalone view з PO previous.
- [ ] Edit Internal → працює.

**Estimated**: 2 days

---

### Stage 8 — Post-apply edit views (1 день)

**Гілка**: `feat/po-edit-post-apply`

**Discovery**:
- [ ] Перевірити чи можна перевикористати `CeoReselectConceptStep.vue` як основу або робити окремо.

**Files to touch**:
- `packages/constructor/src/views/po-edit/PoEditConceptView.vue` (додати mode `post-apply`)
- `packages/constructor/src/views/po-edit/PoEditExternalNamingView.vue` (додати mode `post-apply`)
- `packages/constructor/src/views/po-edit/PoEditInternalNamingView.vue` (додати mode `post-apply`)
- `packages/constructor/src/views/steps/Step10ReviewSubmit.vue` (`Редагувати` → визначити mode)

**Checklist**:
- [ ] У кожному PoEdit view додати mode `post-apply`:
  - Top: single card "Обраний концепт" / "Обрані назви" / "Обрана назва".
  - Below: `Доступні концепти` (або відповідне) + grid з усіх альтернатив (включно з PO original).
  - Footer без змін.
- [ ] Step10: при кліку `Редагувати` на applied секції → mode `post-apply`.
- [ ] Перевірити, що chained-from-concept (Stage 7) працює і для post-apply (якщо PO змінює applied concept → також треба redo external naming).

**Acceptance**:
- Figma `1985:1527 / 1985:3356 / 1985:4010` відтворено.
- PO може передумати після apply і вибрати інший варіант (або повернутись до свого оригінального).

**Manual checks**:
- [ ] Apply CEO concept → клік `Редагувати` → відкрився post-apply view → grid містить PO old concept.
- [ ] Вибрати PO old concept → Зберегти → applied state зник, тепер показуємо "Вибір замовника" і CEO alternative знову з'явилась.

**Estimated**: 1 day

---

### Stage 9 — QA, regression, cleanup (1 день)

**Гілка**: `chore/cleanup-and-qa`

**Files to touch**:
- `packages/constructor/src/views/steps/Step10ReviewSubmit.vue` (видалити legacy `v-else` блок з амбер-баннером)
- `packages/constructor/src/composables/usePrintBrand.ts` (фінальна перевірка PDF)

**Checklist**:
- [ ] Видалити старий `v-else` блок у Step10 (~lines 1372–2053).
- [ ] PDF export — відкрити, перевірити що `ceoComments` показуються (значення з `.value`).
- [ ] Smoke test full happy path: створити бриф → submit → CEO reselect → revise → PO returned-view → resolve коментарі → apply CEO concept → edit external naming chained → save → counter = 0 → submit → CEO approve.
- [ ] Перевірити Slack notification на resubmit (`buildResubmittedMessage`).
- [ ] Перевірити, що CEO-side flow (`ceo-reselect/*`) не зачеплено.
- [ ] Lighthouse / accessibility check на returned-view.
- [ ] Update `docs/PRD-IMPLEMENTATION-AUDIT-*` (опціонально).

**Acceptance**:
- Все працює end-to-end.
- Жоден з 3 раніше реалізованих flow (PO draft, CEO submitted, PO needs_revision legacy) не зламано.

**Manual checks**:
- [ ] Повний end-to-end сценарій з 3 акаунтів (PO + CEO + Admin).
- [ ] Архівований бриф у `approved` стані відкривається без помилок.
- [ ] Brief з legacy `ceo_comments` форматом працює.

**Estimated**: 1 day

---

## 7. Загальний таймлайн

| Stage | Робочих днів |
| --- | --- |
| 0 — Аудит + план | ✅ Готово |
| 1 — Data model + API | 1.0 |
| 2 — Section card visual | 0.5 |
| 3 — Resolve CEO comments | 1.5 |
| 4 — Returned-from-CEO view | 1.0 |
| 5 — Apply CEO variant | 1.5 |
| 6 — Dependency-guard модалки | 0.5 |
| 7 — PO edit views | 2.0 |
| 8 — Post-apply edit views | 1.0 |
| 9 — QA + cleanup | 1.0 |
| **Разом** | **~10 робочих днів** (+ 1–2 буфер) |

---

## 8. Risks & edge cases

### 8.1 Архітектурні

- **R1**. Legacy `ceo_comments` JSON у DB. Migration on read — критично покрити в Stage 1 unit-тестом.
- **R2**. Apply concept → cleanup PO external naming, які несумісні з новим concept_id. Якщо не очистити — broken state.
- **R3**. Атомарний apply (concept + external) у модалці `1985:4362` — треба робити одним PUT, а не двома послідовними (race).
- **R4**. `PoEditExternalNamingView.vue` буде мати 3 mode'и — складно. Якщо стане громіздкою — розбити на 3 окремі views на ранній стадії Stage 7.

### 8.2 UX

- **R5**. CEO-варіант може бути видалений з бібліотеки (`status === 'archived'`) до того, як PO відкрив returned-view. Показати placeholder + disable apply.
- **R6**. Resubmit очищає `ceo_comments` — PM має знати, що історія втрачається. (Сьогодні і так так працює, лише фіксуємо.)
- **R7**. Race condition resolve/unresolve — optimistic update + блокування кнопки.

### 8.3 Регресії

- **R8**. CEO `validateNeedsRevision()` валідація (CEO має додати коментар, якщо обрав альтернативу) — не торкаємо.
- **R9**. PDF export — оновити, не зламати.
- **R10**. Slack notifications — переконатися, що `buildNeedsRevisionMessage` все ще приймає правильний формат `ceoComments`.

---

## 9. Open questions

| # | Питання | Кому | Status |
| --- | --- | --- | --- |
| Q1 | Що показувати, якщо CEO-варіант недоступний (archived) у бібліотеці на момент returned-view? | PM | OPEN |
| Q2 | Чи треба зберігати історію `resolvedAt` в audit_log? | PM | OPEN — поточне рішення: тільки в JSON, без audit |
| Q3 | Якщо PO не написав новий коментар на edit-view, чи треба автоматично clear старий PO коментар? | PM | OPEN — поточне рішення: НЕ clear, snapshot зберігає старе значення |
| Q4 | Після Apply Concept + cleanup PO external naming — чи треба показати PO якесь повідомлення про очищення? | PM / UX | OPEN |
| Q5 | Чи Hard-block кнопки submit — ОК поведінка? | замовник | ✅ CONFIRMED (hard-block, див. §3.1) |
| Q6 | Чи реалізовувати "Reset apply" — повернути dual-view після apply без edit? | PM | OPEN — поточне рішення: не реалізовувати (вистачає `Редагувати`) |

---

## 10. Glossary

| Термін | Означає |
| --- | --- |
| **returned-view** | UI Step10 для PO у статусі `needs_revision` |
| **applied** | Стан, коли `stepData.<section>` ідентичний `brandCeoSelections.<section>` |
| **chained edit** | Edit External Naming, що автоматично відкривається після зміни concept |
| **standalone edit** | Edit External Naming окремо, без зміни concept |
| **post-apply edit** | Edit view, відкритий після того, як PO застосував CEO variant |
| **attention counter** | Кількість секцій з unresolved-коментом або undecided CEO variant |
| **submit gating** | Hard-block кнопки `На погодження CEO` поки counter > 0 |
| **dual-view** | Layout секції з `Вибір замовника / Вибір CEO` side-by-side |
| **single-view** | Layout секції після apply: тільки один варіант |

---

## 11. Changelog

| Версія | Дата | Зміни |
| --- | --- | --- |
| v1.0 | 2026-05-19 | Початкова версія плану. Прийнято hard-block submit, лейбли `Обраний концепт / Обрані назви / Обрана назва`, концепт-external dependency rules. |
| v1.1 | 2026-05-19 | Stage 1 завершено: `CeoCommentMeta` тип, worker migration-on-read, новий endpoint `PATCH /:id/ceo-comments/resolve`, store action `setCeoCommentResolved` з optimistic update. Type-check ✅. Discovery deltas додано. |
