# План исправления багов Figma — Visual Components (Design Review)

Источник: [Figma Design Review](https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=2837-4389) — секция «Реалізація» (скриншот step 7) + таблица «Зауваження» (8 строк).

## Статус выполнения

| # | Баг | Приоритет | Статус |
|---|-----|-----------|--------|
| 1 | Scrollbar | Low | done |
| 2 | Top/bottom padding | Medium | pending |
| 3 | Sidebar width | High | pending |
| 4 | Card padding без комментариев | Low | pending |
| 5 | «Переглянути» vs «Редагувати» | Low | pending |
| 6 | Дубль «Закрити» в модалке | Medium | pending |
| 7 | Empty state при delegate | Medium | pending |
| 8 | Concept → reset External Naming | High | pending |

---

## Bug 1 — Scrollbar (Low)

**Figma:** скролбар слишком близко к контенту и слишком контрастный.

**Корень:** левая колонка wizard — [`dualPaneLayoutClasses.ts`](../../packages/constructor/src/components/constructor/layout/dualPaneLayoutClasses.ts) задаёт `px-12 pt-12 pb-12 overflow-y-auto`, но кастомный scrollbar не подключён (mixin `custom-scrollbar` в [`_mixins.scss`](../../packages/constructor/src/styles/_mixins.scss) есть, но не используется).

**Исправление:**

- На scroll-контейнер `.constructor-dual-pane-shell__main-content` в [`ConstructorDualPaneShell.vue`](../../packages/constructor/src/components/constructor/layout/ConstructorDualPaneShell.vue) повесить `@include custom-scrollbar`.
- Асимметричный padding: `pl-12 pr-3` на scroll + `pr-9` на inner wrapper — полоса ближе к правому краю колонки.
- `scrollbar-gutter: stable` + приглушённый thumb для Firefox.

**Scope:** все wizard-шаги 1–7.

**Реализация (подготовлена, ждёт agent mode):**

1. [`dualPaneLayoutClasses.ts`](../../packages/constructor/src/components/constructor/layout/dualPaneLayoutClasses.ts) — wizard (не step 8): `px-12` → `pl-12 pr-3`.
2. [`ConstructorDualPaneShell.vue`](../../packages/constructor/src/components/constructor/layout/ConstructorDualPaneShell.vue):
   - inner wrapper: класс `constructor-dual-pane-shell__scroll-inner pr-9` для wizard scroll.
   - scoped SCSS: `@include custom-scrollbar`, `scrollbar-gutter: stable`, thumb `rgb(0 0 0 / 0.12)`.

**Как проверить после применения:**

1. Открыть wizard, шаг 7 (Visual Components).
2. Развернуть несколько аккордеонов, чтобы левая колонка скроллилась.
3. Скролбар должен быть **ближе к правому краю** серой колонки (не вплотную к карточкам).
4. Ползунок **приглушённый** (светло-серый), не системный контрастный.
5. Регрессия: шаги 1–6 — контент по-прежнему с ~48px отступом справа, скролл работает.

---

## Bug 2 — Top/bottom fixed areas (Medium)

**Figma:** верхняя и нижняя «фиксированные» зоны левой колонки съедают высоту.

**Корень:** [`BriefShellView.vue`](../../packages/constructor/src/views/BriefShellView.vue) + [`ConstructorDualPaneShell.vue`](../../packages/constructor/src/components/constructor/layout/ConstructorDualPaneShell.vue) — `pt-12 pb-12` внутри scroll при отдельном footer.

**Исправление:**

- Убрать `pb-12` у wizard scroll-области.
- Уменьшить `pt-12` → `pt-8` или перенести padding на inner wrapper.
- Опционально: вынести wizard header из scroll в `shrink-0` блок.

**Scope:** cross-step wizard layout.

---

## Bug 3 — Sidebar не на всю ширину preview (High)

**Figma:** открытый sidebar не перекрывает всю ширину экрана в превью.

**Корень:** geometry + assets — [`useBrandPreviewLayers.ts`](../../packages/constructor/src/composables/useBrandPreviewLayers.ts), разные mockup insets в [`StepPreviewRightPanel.vue`](../../packages/constructor/src/components/constructor/layout/StepPreviewRightPanel.vue) vs [`BrandPreviewPanel.vue`](../../packages/constructor/src/components/constructor/preview/BrandPreviewPanel.vue), Type 2 asset не full-bleed.

**Исправление:**

- Унифицировать mockup insets в одну константу.
- Sidebar slot = 100% ширины phone viewport.
- Перегенерировать Type 2 под 289×614 full-bleed.

**Scope:** step 7 + step 8.

---

## Bug 4 — Лишний нижний отступ без комментариев (Low)

**Figma:** в карточках без комментариев остаётся большой bottom padding.

**Корень:** [`StepCommentField.vue`](../../packages/constructor/src/components/constructor/fields/StepCommentField.vue) с `rows: 3`; accordion body `p-3 space-y-2`.

**Исправление:**

- `StepCommentField`: `rows: 1` + auto-grow.
- Accordion: уменьшить `pb` / `gap`.
- Review: не рендерить comment slot если комментария нет.

**Scope:** step 7 primary.

---

## Bug 5 — «Переглянути» = «Редагувати» (Low)

**Figma:** «Переглянути» — link-style, без pill как у «Редагувати».

**Файлы:** [`ReviewExternalNamingsList.vue`](../../packages/constructor/src/components/constructor/review/ReviewExternalNamingsList.vue), [`ReviewInternalNamingBlock.vue`](../../packages/constructor/src/components/constructor/review/ReviewInternalNamingBlock.vue), [`ReviewPrPackageBlock.vue`](../../packages/constructor/src/components/constructor/review/ReviewPrPackageBlock.vue).

**Scope:** step 8 review.

---

## Bug 6 — Дубли «Закрити» и × в модалке (Medium)

**Figma:** убрать footer «Закрити», оставить × / backdrop / Esc.

**Файл:** [`BriefModalShell.vue`](../../packages/constructor/src/components/constructor/modals/BriefModalShell.vue) — readonly показывает и ×, и footer button.

**Scope:** cross-step modals.

---

## Bug 7 — Empty state при delegateToDesigners (Medium)

**Figma:** один экран с текстом «Компоненти буде визначено дизайн-командою», без iPhone mockup.

**Корень:** [`StepPreviewRightPanel.vue`](../../packages/constructor/src/components/constructor/layout/StepPreviewRightPanel.vue) — сообщение внутри iPhone frame.

**Исправление:** full-panel empty без mockup; тот же паттерн в [`BrandPreviewPanel.vue`](../../packages/constructor/src/components/constructor/preview/BrandPreviewPanel.vue).

**Scope:** step 7 + step 8.

---

## Bug 8 — Concept edit не сбрасывает External Naming (High)

**Figma:** после смены концепта — сброс External Naming, redirect на шаг выбора, сообщение.

**Корень:** [`ConceptSelectionView.vue`](../../packages/constructor/src/views/wizard/ConceptSelectionView.vue) без cascade; эталон — [`useSupervisorReview.ts`](../../packages/constructor/src/composables/useSupervisorReview.ts).

**Исправление:**

1. При смене `concept.selectedId` → очистить `externalNaming.selectedIds`.
2. Save concept edit из review → navigate step 3 + toast.
3. Unit-тесты для cascade reset.

**Scope:** cross-step workflow.

---

## Рекомендуемый порядок работ

| Фаза | Баги | Почему |
|------|------|--------|
| A — Quick wins step 7 | 7, 4, 1 | Видимый UX, малый риск |
| B — Layout | 2 | Решает «тесноту» аккордеонов |
| C — Sidebar | 3 | Code + asset Type 2 |
| D — Review polish | 5, 6 | Step 8 / modals |
| E — Workflow | 8 | Отдельная фича, тесты |

---

## Уже сделано (не дублировать)

- Toast при auto-hide sidebar
- Slide-анимация sidebar (select/deselect/toggle)
- `object-cover object-top` для layer images
- `PHONE_STATUS_BAR_INSET_PX = 34` + исключения для Type 3

---

## QA checklist

1. Step 7: scroll аккордеонов — scrollbar справа, не контрастный
2. Step 7: footer не «съедает» высоту списка компонентов
3. Sidebar Type 1/2/3 — full width в preview
4. Delegate toggle — empty state без iPhone
5. Brief readonly modal — один способ закрытия
6. Review — «Переглянути» визуально слабее «Редагувати»
7. Смена concept → external naming сброшен, redirect на step 3
