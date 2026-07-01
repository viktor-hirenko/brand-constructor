# План исправления багов Figma — CEO Review (Step 10)

Источник: [Figma Design Review — CEO Review](https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=2925-9240&m=dev) — таблица «Зауваження» (11 строк, все **NEW** на момент аудита 2026-07-01).

**Связанные документы:**

- Закрытый пул Visual Components: [`figma-visual-components-bugs.md`](./figma-visual-components-bugs.md) (другой Figma node `2837-4389`)
- Расхождения макет vs PRD (не bug-tracker): [`figma-discrepancies.md`](./figma-discrepancies.md)
- Variant 3 (после закрытия этого пула): [`../architecture/variant-3-implementation-plan.md`](../architecture/variant-3-implementation-plan.md)

---

## Как вести прогресс

**Правило: один баг = одна сессия.** AI не коммитит и не переходит к следующему багу без вашего OK после prod QA.

| Шаг | AI (Agent) | Вы |
|-----|------------|-----|
| 1 | Fix **одного** бага + unit-тесты; tracker → `in_progress` | — |
| 2 | — | Deploy на prod → QA по «Как проверить» |
| 3 | — | «OK, коммить» или «доработай» |
| 4 | Commit (только по вашей команде); tracker → `done` + hash; Progress log | — |
| 5 | Следующий баг — только после commit предыдущего | — |

**Статусы:** `pending` → `in_progress` → `done` | `partial` | `blocked` | `wontfix`

**Порядок:** 028 → 028b → 029 → 032 → 035 → 036 → 034 → 037 → 038 → 033 → 031

**Перед Variant 3 закрыть минимум:** все **HIGH** (031, 035, 036, 037, 038) + желательно батч A (комментарии).

---

## Сводная таблица прогресса

| # | Figma | Баг (текст из макета) | Приоритет | Батч | Статус | Коммит |
|---|-------|------------------------|-----------|------|--------|--------|
| — | *(без №)* | CEO має доступ до брифу, у якому ще не обрано концепт/неймінг, а замовлено новий | **High** | C | **pending** | — |
| 1 | **№1** | Блок коментаря CEO необмежено розтягується по висоті під довжину тексту | Medium | A | **done** | *(commit below)* |
| 2 | BRIEF-029 | Общий комментарий выше, чем секционные | Low | A | **pending** | — |
| 3 | BRIEF-028b | Убрать лейбл «Коментар CEO» внутри textarea общего комментария | Medium | A | **pending** | — |
| 4 | BRIEF-032 | Error state на **всех** полях комментариев при «Повернути» без текста | Medium | A | **partial** | — |
| 5 | BRIEF-033 | Восстановить scroll после возврата из ceo-reselect | Medium | C | **pending** | — |
| 6 | BRIEF-034 | Просмотр оригинального концепта заказчика на ceo-reselect | Medium | B | **pending** | — |
| 7 | BRIEF-035 | CEO может пере-выбрать концепт заказчика | **High** | B | **pending** | — |
| 8 | BRIEF-036 | Имена заказчика недоступны для re-select (External Naming) | **High** | B | **pending** | — |
| 9 | BRIEF-037 | Review: не перезаписывать выбор заказчика выбором CEO | **High** | B | **partial** | — |
| 10 | BRIEF-038 | Модалка подтверждения перед «Погодити» CEO | **High** | C | **pending** | — |

**Итого:** 1 done · 2 partial · 8 pending

---

## Рекомендации по моделям (на каждый шаг)

Используйте **дорогую модель (Opus 4.8 thinking)** точечно — ~30% квоты беречь под **Variant 3**.

| Батч | Баги | Планирование (1 сессия на батч) | Реализация (Agent) | Когда Opus |
|------|------|----------------------------------|--------------------|------------|
| **A** — UI комментариев | 028, 029, 028b, 032 | **Composer / Auto** — достаточно Figma + этот doc | **Composer 2.5 / Auto** | Не нужен |
| **B** — CEO reselect + dual view | 034, 035, 036, 037 | **Composer** для 034, 035, 036; **Opus** для 037 (edge cases) | **Composer**; 037 — Opus если 2+ итерации | 037 product/display logic |
| **C** — Workflow / gates | 031, 033, 038 | **Opus** для 031 (product gate); **Composer** для 033, 038 | **Composer**; 031 — Opus | 031 обязательно |

**Шаблон prompt для сессии исправления одного бага:**

```text
Контекст: docs/design-audit/figma-ceo-review-bugs.md — BRIEF-0XX
Scope: только wizard constructor, без admin/worker unless указано
Acceptance: секция «Как проверить» в doc
После fix: обнови таблицу статусов и Progress log в том же файле
```

---

## Рекомендуемый порядок работ

| Шаг | Батч | Баги | Почему |
|-----|------|------|--------|
| 1 | **A** | 028, 028b, 029, 032 | Один файл `SectionCommentBlock.vue`, быстрый видимый результат на step 8 |
| 2 | **B** | 035 → 036 → 034 → 037 | Одна зона `ceo-reselect/*` + `useSupervisorApplyVariants`; HIGH сначала |
| 3 | **C** | 038 → 033 → 031 | Approve modal и scroll — локально; 031 — gate, лучше после стабильного reselect |

---

## Progress log

| Дата | Баг | Действие | Кто проверил |
|------|-----|----------|--------------|
| 2026-07-01 | — | Создан tracker; аудит кода — все NEW, инфра ceo-reselect есть, фиксов нет | AI audit |
| 2026-07-01 | Figma №1 (BRIEF-028) | Cap + internal scroll для секционных и general CEO comments; unit-тесты | Viktor prod QA |

---

## BRIEF-031 — CEO видит бриф до готовности нового концепта (High)

**Figma:** CEO не должен видеть полный бриф на review, пока команда не выполнила заказ «новий концепт» (brief в работе).

**Текущее состояние (partial infra, bug open):**

- При submit с `newConceptBrief` Slack: «CEO-ревью не потрібне» ([`buildNewBriefsApprovalMessage`](../../packages/worker/src/utils/slack.ts)).
- UI: CEO с ролью `cpo_ceo` при `status === 'submitted'` всё равно попадает в `SUPERVISOR_REVIEW` ([`resolveBrandBriefReviewPhase.ts`](../../packages/constructor/src/domain/reviewPhase/resolveBrandBriefReviewPhase.ts)) — **нет gate**.

**Ключевые файлы:**

- [`resolveBrandBriefReviewPhase.ts`](../../packages/constructor/src/domain/reviewPhase/resolveBrandBriefReviewPhase.ts)
- [`useBrandBriefReviewPhase.ts`](../../packages/constructor/src/composables/useBrandBriefReviewPhase.ts)
- [`BriefReviewView.vue`](../../packages/constructor/src/views/wizard/BriefReviewView.vue)
- [`ReviewUnifiedView.vue`](../../packages/constructor/src/components/constructor/review/ReviewUnifiedView.vue)

**Направление fix (уточнить на planning-сессии Opus):**

- Новая phase или флаг: `submitted` + `hasNewBrief` → для CEO read-only placeholder / redirect / «В роботі» вместо full review.
- Согласовать с PO flow: кнопка «Відправити в роботу» уже есть ([`hasNewBrief`](../../packages/constructor/src/views/wizard/BriefReviewView.vue)).

**Модель:** планирование **Opus 4.8** · реализация **Composer**

**Как проверить:**

1. PO создаёт бриф с «Новий концепт (бриф)», submit «В роботу».
2. CEO открывает тот же brand — **не** видит полный review с approve/revise.
3. После появления концепта в библиотеке и привязки к брифу — CEO видит обычный review.

**Статус:** pending

---

## Figma row №1 — Блок коментаря CEO необмежено розтягується (Medium)

**Как найти в Figma** ([node 2925-9240](https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=2925-9240)): строка с **синим кружком «1»** (не путать с верхней строкой без номера — там другой баг про new concept).

**Проблема (колонка «Зауваження»):** «Блок коментаря CEO необмежено розтягується по висоті під довжину тексту.»

**Рішення (колонка «Рішення»):** «Обмежити висоту блоку коментаря та додати внутрішній скрол для довгих коментарів.»

**Внутренний ID (legacy):** BRIEF-028

**Корень:** [`SectionCommentBlock.vue`](../../packages/constructor/src/components/constructor/fields/SectionCommentBlock.vue) — `autosize()` на textarea без cap.

**Scope:** step 8 review — секционные CEO comments и «Загальний коментар» (`alwaysExpanded`).

**Реализация:**

- [`ceoCommentFieldVisual.ts`](../../packages/constructor/src/constants/ceoCommentFieldVisual.ts) — max 5×24px, `computeCappedTextareaLayout()`
- [`SectionCommentBlock.vue`](../../packages/constructor/src/components/constructor/fields/SectionCommentBlock.vue) — capped `autosize()` для всех CEO textarea

**Статус:** done (prod QA OK)

---

## Figma row №2 — Поле «Загальний коментар» (Low)

**Как найти:** синий кружок **«2»**.

**Проблема:** «Поле "Загальний коментар" має таку саму висоту, як і коментарі до окремих секцій.»

**Рішення:** «Збільшити висоту поля "Загальний коментар" для кращого відображення його важливості та очікуваного обсягу тексту.»

**Внутренний ID (legacy):** BRIEF-029

**Figma:** поле «Загальний коментар» той же визуальной высоты, что секционные CEO fields.

**Корень:** `alwaysExpanded` + тот же autosize без shared height token.

**Файлы:** `SectionCommentBlock.vue`, [`ReviewUnifiedView.vue`](../../packages/constructor/src/components/constructor/review/ReviewUnifiedView.vue) (general block).

**Модель:** **Composer** — делать вместе с BRIEF-028 (общие CSS-константы min/max height).

**Статус:** pending

---

## BRIEF-028b — Лейбл внутри general comment (Medium)

**Figma:** в «Загальний коментар CEO» не дублировать inner label «Коментар CEO» над textarea (заголовок секции уже есть).

**Корень:** `SectionCommentBlock` всегда рендерит `.section-comment__ceo-editor-label`.

**Fix:** prop `hideSupervisorLabel?: boolean` или `alwaysExpanded` + section `general` → без inner label.

**Модель:** **Composer**

**Статус:** pending

---

## BRIEF-032 — Error state на всех полях (Medium)

**Figma:** при «Повернути на доопрацювання» без комментариев — highlight **всех** пустых CEO comment fields, не только general warning.

**Текущее (partial):**

- [`useSupervisorReviewComments.ts`](../../packages/constructor/src/composables/useSupervisorReviewComments.ts) — `validateNeedsRevision`: при `no-comment` только `revisionRequiresAnyComment` → highlight general ([`ReviewUnifiedView`](../../packages/constructor/src/components/constructor/review/ReviewUnifiedView.vue) `:highlighted="!!revisionWarning"`).
- Секции с alternative pick без комментария — highlight через `revisionMissingSections` (только concept/external/internal).

**Fix:** при `reason === 'no-comment'` помечать все editable empty section fields + general; единый amber border token.

**Модель:** **Composer** · тесты в `useSupervisorReviewComments` spec

**Статус:** partial

---

## BRIEF-033 — Scroll position после ceo-reselect (Medium)

**Figma:** вернувшись с `/ceo-reselect/*` на step 8, CEO остаётся на той же позиции scroll, что до «Змінити».

**Корень:** [`AlternativeConceptView.vue`](../../packages/constructor/src/views/alternative-selection/AlternativeConceptView.vue) / [`AlternativeExternalNamingView.vue`](../../packages/constructor/src/views/alternative-selection/AlternativeExternalNamingView.vue) — `goBack()` / save → `router.push` без scroll restore.

**Fix:** сохранять `scrollTop` review container в sessionStorage/pinia перед уходом; restore в `BriefReviewView` onMounted / onActivated.

**Модель:** **Composer**

**Статус:** pending

---

## BRIEF-034 — Preview концепта заказчика на reselect (Medium)

**Figma:** на ceo-reselect CEO может кликнуть «Вибір замовника» и увидеть preview справа.

**Текущее:** [`AuthorPickPreview.vue`](../../packages/constructor/src/components/constructor/alternative-selection/AuthorPickPreview.vue) — `ConceptCard` с `:clickable="false"`.

**Fix:** click → `selectSupervisorAlternativeConcept` только для preview ИЛИ отдельный `@preview` → right panel в [`BriefShellView.vue`](../../packages/constructor/src/views/BriefShellView.vue) (без сохранения как CEO pick).

**Модель:** **Composer**

**Статус:** pending

---

## BRIEF-035 — CEO re-select концепта заказчика (High)

**Figma:** CEO должен иметь возможность подтвердить концепт заказчика (согласиться), даже после выбора другого.

**Текущее (намеренно заблокировано):**

- [`AlternativeConceptView.vue`](../../packages/constructor/src/views/alternative-selection/AlternativeConceptView.vue): `availableConcepts` **исключает** `poConceptId`; `primaryDisabled` если выбран PO concept; `goNext` early return если `id === po`.

**Fix:** явный CTA «Погодитись з вибором замовника» или включить PO card в grid + save path `ceoSelections.concept = poConceptId` без chained external-naming redirect.

**Модель:** планирование **Composer** (product clear) · при споре flow — **Opus**

**Статус:** pending

---

## BRIEF-036 — Re-select имён заказчика (External Naming) (High)

**Figma:** на ceo-reselect external naming CEO может снова выбрать те же имена, что выбрал PO.

**Текущее:**

- [`AlternativeExternalNamingView.vue`](../../packages/constructor/src/views/alternative-selection/AlternativeExternalNamingView.vue): `excludedFromGrid` убирает PO picks из grid; только read-only [`AuthorNamingsRow`](../../packages/constructor/src/components/constructor/alternative-selection/AuthorNamingsRow.vue).

**Fix:** toggle PO names into `supervisorAlternativeDraft.externalNamingIds` (click row / «Обрати ці назви»); не дублировать в grid и row одновременно.

**Модель:** **Composer**

**Статус:** pending

---

## BRIEF-037 — Dual view: PO vs CEO на review (High)

**Figma:** на step 8 всегда различать «Вибір замовника» и «Вибір CEO»; не подменять колонку заказчика CEO-выбором.

**Текущее (partial infra):**

- [`ReviewChoiceGroup.vue`](../../packages/constructor/src/components/constructor/review/ReviewChoiceGroup.vue) + [`useSupervisorApplyVariants.ts`](../../packages/constructor/src/composables/useSupervisorApplyVariants.ts) — dual layout когда `isCeoChoiceAnAlternative`.
- [`ceoExternalItemsForReview`](../../packages/constructor/src/composables/useSupervisorApplyVariants.ts): фильтр дубликатов может скрывать CEO column; edge case «CEO выбрал subset PO» — проверить по Figma.

**Fix:** пройти матрицу кейсов (same / partial overlap / full replace / new brief); unit-тесты на projections.

**Модель:** планирование **Opus 4.8** · реализация **Composer**

**Статус:** partial

---

## BRIEF-038 — Confirm modal перед Approve (High)

**Figma:** кнопка «Погодити» → confirmation modal → PATCH approved.

**Текущее:** [`ReviewUnifiedView.vue`](../../packages/constructor/src/components/constructor/review/ReviewUnifiedView.vue) `@approve` → сразу `status-change approved`. [`ConfirmationModal`](../../packages/constructor/src/components/ui/ConfirmationModal.vue) уже используется в [`BriefReviewView.vue`](../../packages/constructor/src/views/wizard/BriefReviewView.vue) для PO apply flows.

**Fix:** `showApproveConfirm` ref + modal (title/body из Figma) перед `handleStatusChange('approved')`.

**Модель:** **Composer**

**Статус:** pending

---

## Уже есть в коде (не дублировать при fix)

- Маршруты `ceo-reselect/concept`, `ceo-reselect/concept/external-naming`, standalone external naming
- [`useSupervisorReviewComments`](../../packages/constructor/src/composables/useSupervisorReviewComments.ts) — базовая валидация needs_revision
- [`ReviewChoiceGroup`](../../packages/constructor/src/components/constructor/review/ReviewChoiceGroup.vue) — dual PO/CEO layout
- [`AuthorPickPreview`](../../packages/constructor/src/components/constructor/alternative-selection/AuthorPickPreview.vue) — read-only карточка PO (без preview click)
- PO apply CEO variant modals (Figma 1985:4362, 1985:4657) — **не** approve modal

---

## QA checklist (весь пул)

- [ ] BRIEF-031 — CEO blocked / placeholder при new concept brief in progress
- [ ] BRIEF-028 — section comment max-height + inner scroll
- [ ] BRIEF-029 — general comment same height as section fields
- [ ] BRIEF-028b — no inner «Коментар CEO» label in general block
- [ ] BRIEF-032 — all empty CEO fields highlighted on failed revise
- [ ] BRIEF-033 — scroll restored after ceo-reselect cancel/save
- [ ] BRIEF-034 — PO concept preview on click in reselect
- [ ] BRIEF-035 — CEO can confirm PO concept choice
- [ ] BRIEF-036 — CEO can re-select PO external naming picks
- [ ] BRIEF-037 — review shows PO and CEO columns correctly (all overlap cases)
- [ ] BRIEF-038 — approve confirmation modal

---

## Связь с Variant 3

Закрыть **BRIEF-035–037** и **031** до merge admin+wizard: те же `BriefShellView`, review phase resolver и ceo-reselect routes будут затронуты при смене `base` path и едином origin.
