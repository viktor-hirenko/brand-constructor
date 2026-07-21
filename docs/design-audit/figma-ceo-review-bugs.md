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
| 1 | **№1** | Блок коментаря CEO необмежено розтягується по висоті під довжину тексту | Medium | A | **done** | `4ce8625` |
| 2 | BRIEF-029 | Общий комментарий выше, чем секционные | Low | A | **done** | `60ef870` |
| 3 | BRIEF-028b | Убрать лейбл «Коментар CEO» внутри textarea общего комментария | Medium | A | **done** | `60ef870` |
| 4 | BRIEF-032 | Error state на **всех** полях комментариев при «Повернути» без текста | Medium | A | **done** | `69cd593` |
| 5 | BRIEF-033 | Після повернення з ceo-reselect відновлювати scroll | Medium | C | **done** | `c7198e7` |
| 6 | BRIEF-034 | Просмотр оригинального концепта заказчика на ceo-reselect | Medium | B | **done** | `9b135e8` |
| 7 | BRIEF-035 | CEO может пере-выбрать концепт заказчика | **High** | B | **done** | `ff31929` |
| 8 | BRIEF-036 | Имена заказчика недоступны для re-select (External Naming) | **High** | B | **done** | `b45bbbc` |
| 9 | BRIEF-037 | Review: не перезаписывать выбор заказчика выбором CEO | **High** | B | **done** | `d8e4ecf` |
| 10 | BRIEF-038 | Confirmation modal перед затвердженням CEO | **High** | C | **done** | `c7198e7` |

**Итого:** 10 done · 0 in_progress · 1 pending (BRIEF-031)

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
| 2026-07-01 | BRIEF-028b, BRIEF-029 | General label removed; taller general field (6–12 lines) | Viktor prod QA |
| 2026-07-20 | Figma №4 (BRIEF-032) | Highlight all empty CEO comment fields on failed needs_revision; unit-тесты | Viktor prod QA |
| 2026-07-20 | Figma №7 (BRIEF-035) | PO concept card selectable on ceo-reselect; save + return to review | Viktor prod QA |
| 2026-07-20 | Figma №8 (BRIEF-036) | PO external naming selectable on ceo-reselect | Viktor prod QA |
| 2026-07-20 | Figma №6 (BRIEF-034) | PO concept preview in right slider on ceo-reselect | Viktor prod QA |
| 2026-07-21 | BRIEF-033, BRIEF-038 | Scroll restore after ceo-reselect; approve confirmation modals (standard + warning) | Viktor prod QA |
| 2026-07-21 | BRIEF-037 | Full CEO external naming list in dual review view (no PO dedup filter) | Viktor prod QA |

---

## BRIEF-031 — CEO видит бриф до готовности нового концепта (High)

**Figma:** CEO не должен видеть полный бриф на review, пока команда не выполнила заказ «новий концепт» (brief в работе).

**Текущее состояние (partial infra, bug open):**

- При submit с `newConceptBrief`/`newNamingBrief`/`internalNamingFeedback` Slack пишет «Бриф містить нові замовлення. CEO-ревью не потрібне» ([`buildNewBriefsApprovalMessage`](../../packages/worker/src/utils/slack.ts):747; условие — [`brandHasNewBriefs`](../../packages/worker/src/utils/brand-export.ts):12).
- UI: CEO с ролью `cpo_ceo` при `status === 'submitted'` всё равно попадает в `SUPERVISOR_REVIEW` ([`resolveBrandBriefReviewPhase.ts`](../../packages/constructor/src/domain/reviewPhase/resolveBrandBriefReviewPhase.ts):46) — **нет gate**. Бэкенд и фронт расходятся: бэк уже знает, что ревью не нужно, фронт этого не учитывает.

### Точки неоднозначности для Opus (product-решения)

1. **Сигнал «в работе».** `submitted + brandHasNewBriefs` = заказ в работе. Что именно триггерит «готово»: очистка `newConceptBrief` + проставленный `concept.selectedId`? отдельный статус? Нужно свериться с worker-flow (что делает команда, чтобы вернуть бриф на ревью).
2. **Что видит CEO пока в работе.** read-only placeholder «В роботі, очікує виконання» / redirect на список / баннер без approve+revise? В любом случае — скрыть `SupervisorActionsFooter` (approve/revise).
3. **Частичный случай.** Только internalNamingFeedback (без нового концепта) — нужен ли gate или ревью допустимо? Уточнить.

### Направление fix

- Разделить `brandHasNewBriefs` в shared util (переиспользовать логику worker на фронте) → `hasNewBrief` во [`BriefReviewView`](../../packages/constructor/src/views/wizard/BriefReviewView.vue):140 уже близок.
- Новая phase `SUPERVISOR_AWAITING_WORK` **или** флаг в resolver: `isSupervisor && status==='submitted' && hasNewBrief` → отдельный read-only экран.
- `ReviewUnifiedView`/`BriefReviewView` — рендер placeholder, скрыть footer approve/revise.
- Unit-тесты на `resolveBrandBriefReviewPhase` (submitted + hasNewBrief + isSupervisor → новая phase).

**Ключевые файлы:** `resolveBrandBriefReviewPhase.ts`, `BrandBriefReviewPhase.ts`, `useBrandBriefReviewPhase.ts`, `BriefReviewView.vue`, `ReviewUnifiedView.vue`, `tests/unit/domain/resolveBrandBriefReviewPhase.test.ts`.

**Модель:** планирование **Opus 4.8** (сигнал «готово» + UX placeholder — product-логика) · реализация **Composer 2.5**

**Как проверить:**

1. PO создаёт бриф с «Новий концепт (бриф)», submit «Відправити в роботу».
2. CEO открывает тот же brand — **не** видит полный review с approve/revise, видит placeholder «В роботі».
3. После появления концепта в библиотеке и привязки к брифу (сигнал по п.1 Opus) — CEO видит обычный review с approve/revise.

**Статус:** pending (ждёт planning-решения по сигналу «готово»)

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

**Реализация:**

- `useSupervisorReviewComments.ts` — при `no-comment` в `revisionMissingSections` попадают все editable пустые секции
- `ReviewUnifiedView.vue` — highlight на всех секциях CEO (не только concept/external/internal)
- Ввод текста в любое поле сбрасывает no-comment highlight
- Unit-тесты в `useSupervisorReviewComments.test.ts`

**Как проверить:**

1. CEO review, все комментарии пустые → «Повернути на доопрацювання».
2. Amber border на **всех** «+ Коментар CEO» / пустых textarea + «Загальний коментар».
3. Предупреждение под кнопкой остаётся.
4. Начать печатать в любом поле — подсветка снимается.
5. Alternative pick без комментария — по-прежнему только нужные секции.

**Статус:** done (prod QA OK)

---

## BRIEF-033 — Scroll position после ceo-reselect (Medium)

**Figma:** вернувшись с `/ceo-reselect/*` на step 8, CEO остаётся на той же позиции scroll, что до «Змінити».

### Диагностика (цепочка кода)

- Скролл-контейнер step-8 review = `.review-unified-view__scroll` (`overflow-y-auto`, [`ReviewUnifiedView.vue`](../../packages/constructor/src/components/constructor/review/ReviewUnifiedView.vue):372). Именно у этого элемента `scrollTop`, не у `window`.
- Уход: [`startCeoReselectBySection`](../../packages/constructor/src/views/wizard/BriefReviewView.vue):176 → `router.push('/ceo-reselect/...')`.
- Возврат: save/goBack в [`AlternativeConceptView.vue`](../../packages/constructor/src/views/alternative-selection/AlternativeConceptView.vue) / [`AlternativeExternalNamingView.vue`](../../packages/constructor/src/views/alternative-selection/AlternativeExternalNamingView.vue) → `router.push` на brand review. Контейнер пересоздаётся (не `keep-alive`) → `scrollTop` = 0.

### Fix (реализация)

1. Добавить `ref` на `.review-unified-view__scroll` в `ReviewUnifiedView` + `defineExpose({ getScrollTop, setScrollTop })` (или прокинуть событие/prop).
2. Перед `startCeoReselectBySection` сохранять `scrollTop` в sessionStorage по ключу `review-scroll:{brandId}` (не pinia — переживает F5, дёшево).
3. В `BriefReviewView` после возврата (`onMounted` при phase `SUPERVISOR_REVIEW` + брифинг-данные загружены) — `nextTick` → восстановить `scrollTop`, затем очистить ключ.
4. Восстанавливать только когда предыдущий маршрут был `ceo-reselect` (через `router` guard / `from.meta.ceoReselect`), чтобы обычный вход давал scroll top.

**Файлы:** `ReviewUnifiedView.vue` (ref + expose), `BriefReviewView.vue` (save/restore), опц. новый `useReviewScrollMemory.ts` composable.

**Как проверить:**

1. CEO (`cpo_ceo`) → длинный бриф, проскроллить до Internal Naming → «Змінити вибір».
2. Save или «Назад» → вернуться на review → позиция scroll = там же (Internal Naming виден), не наверху.
3. Свежий заход на review (не из reselect) → scroll top.
4. F5 на review → scroll top (ключ не восстанавливается вне reselect-возврата).

**Модель:** **Composer 2.5**

**Статус:** done (prod QA OK)

---

## BRIEF-034 — Preview концепта заказчика на reselect (Medium)

**Figma:** на ceo-reselect CEO может кликнуть «Вибір замовника» и увидеть preview справа.

**Корень:** PO concept загружается отдельно (`apiGet`), но `BriefShellView` искал его только в `librariesStore.concepts` → slider пустой.

**Реализация (in_progress):**

- `BriefShellView.vue` — fetch concept by `conceptPreviewId` when missing from library; label «Вибір замовника» vs «Вибір СЕО»
- `AuthorPickPreview.vue` — emit `@preview` + `previewed` active state
- `AlternativeConceptView.vue` — `setSupervisorAlternativeConceptPreview` on PO click

**Как проверить:**

1. CEO (`cpo_ceo`) → review → Concept «Змінити».
2. Правая панель пустая до клика.
3. Клик по карточке в «Вибір замовника» → справа slider с PO concept, badge **«Вибір замовника»**.
4. Клик по концепту из «Доступні концепти» → slider переключается, badge **«Вибір СЕО»**.
5. Регрессия BRIEF-035: повторный клик по PO → selected + «Далі» → save PO concept.

**Модель:** **Composer**

**Статус:** done (prod QA OK)

---

## BRIEF-035 — CEO re-select концепта заказчика (High)

**Figma:** CEO должен иметь возможность подтвердить концепт заказчика (согласиться), даже после выбора другого.

**Текущее (намеренно заблокировано):**

- [`AlternativeConceptView.vue`](../../packages/constructor/src/views/alternative-selection/AlternativeConceptView.vue): `availableConcepts` **исключает** `poConceptId`; `primaryDisabled` если выбран PO concept; `goNext` early return если `id === po`.

**Fix:** явный CTA «Погодитись з вибором замовника» или включить PO card в grid + save path `ceoSelections.concept = poConceptId` без chained external-naming redirect.

**Реализация (in_progress):**

- `AuthorPickPreview.vue` — PO card selectable + selected state (ring/checkmark)
- `AlternativeConceptView.vue` — клик по «Вибір замовника»; «Далі» при PO concept сохраняет `concept` + PO `externalNaming` и возвращает на review

**Как проверить:**

1. CEO (`cpo_ceo`) → review → Concept «Змінити» → выбрать другой concept → сохранить → снова «Змінити».
2. Клик по карточке в «Вибір замовника» → selected, «Далі» активна.
3. «Далі» → review; concept снова PO, без CEO alternative.
4. Регрессия: выбор из грида «Доступні концепти» → chained flow на external naming как раньше.

**Модель:** **Composer**

**Статус:** done (prod QA OK)

---

## BRIEF-036 — Re-select имён заказчика (External Naming) (High)

**Figma:** на ceo-reselect external naming CEO может снова выбрать те же имена, что выбрал PO.

**Текущее:**

- [`AlternativeExternalNamingView.vue`](../../packages/constructor/src/views/alternative-selection/AlternativeExternalNamingView.vue): `excludedFromGrid` убирает PO picks из grid; только read-only [`AuthorNamingsRow`](../../packages/constructor/src/components/constructor/alternative-selection/AuthorNamingsRow.vue).

**Fix:** toggle PO names into `supervisorAlternativeDraft.externalNamingIds` (click row / «Обрати ці назви»); не дублировать в grid и row одновременно.

**Реализация (in_progress):**

- `AuthorNamingsRow.vue` — selectable PO cards + checkmark; кнопка «Обрати ці назви»
- `AlternativeExternalNamingView.vue` — убран strip PO ids при mount; wire toggle/select-all в draft

**Как проверить:**

1. CEO (`cpo_ceo`) → review → External Naming «Змінити» (standalone route, не chained).
2. В «Вибір замовника» клик по карточке PO → selected (ring + checkmark), «Зберегти» активна при валидном наборе.
3. Повторный клик → deselect; имена PO **не** появляются в гриде «Варіанти назв» (только в row).
4. «Обрати ці назви» → все PO-имена в selection (до лимита 3).
5. Сохранить → review: external naming совпадает с PO picks (CEO подтвердил выбор заказчика).
6. Регрессия: выбор альтернатив из CEO-грида + mixed с PO — лимит 3, comment validation для sold.

**Модель:** **Composer**

**Статус:** done (prod QA OK)

---

## BRIEF-037 — Dual view: PO vs CEO на review (High)

**Оригинал Figma (№9, «Зауваження»):** «Після перевибору Concept та External Naming, в секції External Naming початковий вибір замовника замінюється вибором CEO. При цьому залишається лейбл "Вибір замовника"».
**Рішення (Figma):** «Зберігати та відображати окремо вибір замовника і вибір СЕО.»

### Диагностика (цепочка кода)

**Данные:**
- PO-выбор: `stepData.externalNaming.selectedIds` (источник — [`selectedExternalNamings`](../../packages/constructor/src/views/wizard/BriefReviewView.vue) → prop `items`).
- CEO-выбор: `brandCeoSelections.externalNaming` (источник — [`ceoExternalItemsForReview`](../../packages/constructor/src/composables/useSupervisorApplyVariants.ts) → prop `ceo-items`).
- [`saveCeoSelections`](../../packages/constructor/src/stores/constructor/useSupervisorReview.ts) пишет **только** в `brandCeoSelections`, `stepData` **не трогает** → PO-выбор физически сохраняется (перезаписи store нет в текущем коде).

**Рендер:** [`ReviewExternalNamingsList.vue`](../../packages/constructor/src/components/constructor/review/ReviewExternalNamingsList.vue) `showDual = ceoItems.length > 0 && !ceoApplied`. Два **вертикальных** блока через [`ReviewChoiceGroup`](../../packages/constructor/src/components/constructor/review/ReviewChoiceGroup.vue) (`flex-col`, не grid): слот `po` = «Вибір замовника», слот `ceo` = «Вибір CEO» (сверху вниз, не в ряд как карточки Concept).

**Найденный дефект (исправлен):**

- **Фильтр-дедуп урезал CEO-список.** В `ceoExternalItemsForReview` отбрасывались ID, совпадающие с PO (`ids.filter(id => !poIdSet.has(id))`. При частичном пересечении (PO `[A,B,C]`, CEO `[A,B,D]`) в блоке CEO показывался только `[D]` вместо `[A,B,D]`.

**Product-решение (кейс 2 — CEO согласился с PO):** один блок «Вибір замовника» (single layout), без дублирования одинаковых списков — `isSupervisorChoiceAnAlternative` = false → dual не показываем.

### Fix (реализация)

- `ceoExternalItemsForReview` — **убран** фильтр `!poIdSet.has(id)`; возвращается полный CEO-набор.
- Unit-тесты: [`useSupervisorApplyVariants.test.ts`](../../packages/constructor/tests/unit/composables/useSupervisorApplyVariants.test.ts) — overlap, full replace, subset, agree-with-PO.

**Файлы:** `useSupervisorApplyVariants.ts`, `tests/unit/composables/useSupervisorApplyVariants.test.ts`.

### Как проверить (prod QA)

**Базовый URL:** `https://brand-constructor-app.pages.dev/constructor/brand/{brandId}`  
**Роль:** `cpo_ceo` (CEO / supervisor).

#### Готовые брифы на prod (не нужно создавать с нуля)

| Бриф | ID | Зачем | Что уже в данных |
|------|-----|-------|------------------|
| **New Brand #23** | `brand_a20e8acbdd8b4fcf` | **Главный тест BRIEF-037** | PO external: **Chancewood**; CEO external: **Joymus** (разные). CEO concept тоже отличается от PO. |
| **New Brand #11** | `brand_99f60e3b872e4fa9` | Регрессия «CEO не менял» | PO: **TestEcho**; `ceo_selections` пуст — только один блок «Вибір замовника». |
| **New Brand #1** | `brand_87f560b858654a43` | Регрессия dual + approve warning | PO: **TestEcho**; CEO external: **WinRide** (другой). |
| **New Brand #13** | `brand_1ffc50c0a75845a5` | BRIEF-031 (не этот фикс) | new concept brief in progress — не использовать для 037. |

#### Сценарий A — главный (Brand #23, уже сохранён dual)

1. Открыть `…/constructor/brand/brand_a20e8acbdd8b4fcf` под CEO.
2. Проскроллить до секции **External Naming**.
3. **Ожидание:**
   - Сверху подпись **«Вибір замовника»** → bullet **Chancewood (Chancewood.com)**.
   - Ниже подпись **«Вибір CEO»** → bullet **Joymus (Joymus.com)**.
   - **Не должно быть:** один список с Joymus под лейблом «Вибір замовника».
4. Секция **Concept** — тоже dual (две карточки в ряд): PO-концепт слева, CEO-концепт справа.

#### Сценарий B — overlap (если пересохранить на #23 или другом submitted-брифе)

1. CEO → review → External Naming → **«Змінити вибір»**.
2. В гриде: оставить 1–2 имени из PO-блока «Вибір замовника», снять одно, добавить другое из «Доступні неймінги» (итого 3 имени, часть совпадает с PO).
3. **«Зберегти»** → вернуться на review.
4. **Ожидание:** блок PO = **все** исходные PO-имена (не изменились); блок CEO = **все 3** выбранных CEO-имени, включая те, что совпали с PO (не только «новые»).

#### Сценарий C — CEO согласился с PO (Brand #11)

1. Открыть `brand_99f60e3b872e4fa9`.
2. External Naming → «Змінити вибір» → выбрать **ровно** TestEcho (как у PO) → «Зберегти».
3. **Ожидание:** один блок **«Вибір замовника»** с TestEcho; блока «Вибір CEO» **нет**.

#### Сценарий D — полная замена CEO-набором

1. Любой submitted-бриф с 3 PO-именами → ceo-reselect external → выбрать **3 других** имени (ни одного из PO) → save.
2. **Ожидание:** dual; PO = старые 3; CEO = новые 3.

#### Регрессии (не сломать другие флоу)

| Что проверить | Бриф / действие | Ожидание |
|---------------|-----------------|----------|
| BRIEF-033 scroll | Длинный бриф, scroll до Internal Naming → «Змінити» concept → save/back | Scroll на том же месте |
| BRIEF-038 approve standard | Brand #11, CEO не менял naming → «Затвердити» | Modal «Затвердити бриф?», кнопки в ряд |
| BRIEF-038 approve warning | Brand #23 или #1 → «Затвердити» | Warning modal, кнопки столбиком |
| BRIEF-036 PO names selectable | ceo-reselect external | PO-имена в верхнем блоке кликабельны |
| PO returned view | Бриф в `needs_revision` под PO | «Застосувати варіант CEO» по external naming работает |
| DevTools | Ctrl+F `review-external-list--dual-view` | Класс есть только при dual |

**Модель:** **Composer 2.5**

**Статус:** done (prod QA OK, commit `d8e4ecf`)

---

## BRIEF-038 — Confirm modal перед Approve (High)

**Figma №10 (High).** Зауваження: «CEO може затвердити бриф без додаткового підтвердження, навіть якщо залишав коментарі або пропонував інші варіанти.»  
Рішення: «Додати confirmation modal перед затвердженням брифу.»  
Коментар Figma: для стандартного сценарію — Confirmation modal; якщо CEO змінив Concept / External Naming / Internal Naming — warning-модалка з можливістю повернути на доопрацювання або продовжити затвердження.

**Figma nodes:** [2929:11846](https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=2929-11846) (standard) · [2929:12425](https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=2929-12425) (warning)

### Реализация

- [`BriefReviewView.vue`](../../packages/constructor/src/views/wizard/BriefReviewView.vue) — перехват `handleStatusChange('approved')` → модалка; `executeStatusChange` только после confirm.
- [`ConfirmationModal.vue`](../../packages/constructor/src/components/ui/ConfirmationModal.vue) — prop `actionsLayout: 'row' | 'stack'` (default `row`); warning approve использует `stack`.
- PO modals (Modal 1/2) и wizard modals **без изменений** — default `row`.

**Тексты (standard, Figma 2929:11846):**
- title: «Затвердити бриф?»
- body: «Після затвердження буде запущено наступні етапи роботи над брендом та надіслано повідомлення в командні канали.»
- кнопки в **ряд**: «Скасувати» | «Затвердити»

**Тексты (warning, Figma 2929:12425):**
- title: «Ви внесли зміни до брифу»
- body: «Ви змінили вибір концепту або неймінгу. За потреби поверніть бриф на доопрацювання перед затвердженням.»
- кнопки **столбиком**: «Повернути на доопрацювання» (сверху) · «Затвердити бриф» (снизу)

### Как проверить

1. CEO (`cpo_ceo`) → review (`submitted`) → **не менял** concept/naming → «Затвердити» → standard modal, body про «наступні етапи… командні канали», кнопки **в ряд**.
2. «Скасувати» → остаёмся на review, статус не меняется.
3. «Затвердити» в модалке → approved → `/constructor/success`.
4. CEO **сменил** concept или naming через «Змінити вибір» → «Затвердити» → warning modal «Ви внесли зміни до брифу», кнопки **столбиком**.
5. «Повернути на доопрацювання» в warning → needs_revision flow (нужен комментарий CEO).
6. «Затвердити бриф» в warning → approved.
7. Регрессия: PO Modal 1/2 и wizard delete/switch modals — layout **в ряд**, тексты без изменений.

**Модель:** **Composer 2.5**

**Статус:** done (prod QA OK)

---

## Уже есть в коде (не дублировать при fix)

- Маршруты `ceo-reselect/concept`, `ceo-reselect/concept/external-naming`, standalone external naming
- [`useSupervisorReviewComments`](../../packages/constructor/src/composables/useSupervisorReviewComments.ts) — базовая валидация needs_revision
- [`ReviewChoiceGroup`](../../packages/constructor/src/components/constructor/review/ReviewChoiceGroup.vue) — dual PO/CEO layout
- [`AuthorPickPreview`](../../packages/constructor/src/components/constructor/alternative-selection/AuthorPickPreview.vue) — selectable PO card + preview click
- PO apply CEO variant modals (Figma 1985:4362, 1985:4657) — **не** approve modal

---

## QA checklist (весь пул)

- [ ] BRIEF-031 — CEO blocked / placeholder при new concept brief in progress
- [x] BRIEF-028 — section comment max-height + inner scroll
- [x] BRIEF-029 — general comment same height as section fields
- [x] BRIEF-028b — no inner «Коментар CEO» label in general block
- [x] BRIEF-032 — all empty CEO fields highlighted on failed revise
- [x] BRIEF-033 — scroll restored after ceo-reselect cancel/save
- [x] BRIEF-034 — PO concept preview on click in reselect
- [x] BRIEF-035 — CEO can confirm PO concept choice
- [x] BRIEF-036 — CEO can re-select PO external naming picks
- [x] BRIEF-037 — review shows PO and CEO lists correctly (overlap cases)
- [x] BRIEF-038 — approve confirmation modal

---

## Связь с Variant 3

Закрыть **BRIEF-035–037** и **031** до merge admin+wizard: те же `BriefShellView`, review phase resolver и ceo-reselect routes будут затронуты при смене `base` path и едином origin.
