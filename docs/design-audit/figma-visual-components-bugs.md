# План исправления багов Figma — Visual Components (Design Review)

Источник: [Figma Design Review](https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=2837-4389) — секция «Реалізація» (скриншот step 7) + таблица «Зауваження» (8 строк).

## Статус выполнения

| # | Баг | Приоритет | Статус |
|---|-----|-----------|--------|
| 1 | Scrollbar | Low | **done** |
| 2 | Top/bottom padding | Medium | **partial** (review/step 8 + edit — **done**; wizard 1–7 — pending) |
| 3 | Sidebar width | High | **done** |
| 4 | Card padding без комментариев | Low | **done** (`76168a8`) |
| 5 | «Переглянути» vs «Редагувати» | Low | **done** |
| 6 | Дубль «Закрити» в модалке | Medium | **done** |
| 7 | Empty state при delegate | Medium | **done** |
| 8 | Concept → reset External Naming | High | pending ← следующий |

---

## Bug 1 — Scrollbar (Low)

**Figma:** скролбар слишком близко к контенту и слишком контрастный.

**Корень:** левая колонка wizard — [`dualPaneLayoutClasses.ts`](../../packages/constructor/src/components/constructor/layout/dualPaneLayoutClasses.ts) задаёт `px-12 pt-12 pb-12 overflow-y-auto`, но кастомный scrollbar не подключён (mixin `custom-scrollbar` в [`_mixins.scss`](../../packages/constructor/src/styles/_mixins.scss) есть, но не используется).

**Исправление:**

- На scroll-контейнер `.constructor-dual-pane-shell__main-content` в [`ConstructorDualPaneShell.vue`](../../packages/constructor/src/components/constructor/layout/ConstructorDualPaneShell.vue) повесить `@include custom-scrollbar`.
- Асимметричный padding: `pl-12 pr-3` на scroll + `pr-9` на inner wrapper — полоса ближе к правому краю колонки.
- `scrollbar-gutter: stable` + приглушённый thumb для Firefox.

**Scope:** wizard 1–7, review (step 8), edit/reselect (step 8 sub-routes).

**Реализация (done):**

- Коммиты: `5782b9b` (wizard 1–7), `12d1dae` (review + edit — gutter на реальном scroll-контейнере).
- [`dualPaneLayoutClasses.ts`](../../packages/constructor/src/components/constructor/layout/dualPaneLayoutClasses.ts) — константы `LEFT_PANE_SCROLL_*`: `pl-12 pr-3` на scroll, `pr-9` на inner.
- [`global.scss`](../../packages/constructor/src/styles/global.scss) — `.left-pane-scroll` (5px thumb, `rgb(0 0 0 / 0.12)`).
- Wizard: scroll на `.main-content` + `pr-9` на router-view inner ([`ConstructorDualPaneShell.vue`](../../packages/constructor/src/components/constructor/layout/ConstructorDualPaneShell.vue)).
- Review: scroll на [`ReviewUnifiedView.vue`](../../packages/constructor/src/components/constructor/review/ReviewUnifiedView.vue) `__scroll` / `__scroll-inner`.
- Edit: scroll на [`EditFlowStepShell.vue`](../../packages/constructor/src/components/constructor/edit-flow/EditFlowStepShell.vue) `__body` / `__inset`.

**Как проверить:**

1. Открыть wizard, шаг 7 (Visual Components).
2. Развернуть несколько аккордеонов, чтобы левая колонка скроллилась.
3. Скролбар должен быть **ближе к правому краю** серой колонки (не вплотную к карточкам).
4. Ползунок **приглушённый** (светло-серый), не системный контрастный.
5. Регрессия: шаги 1–6, step 8 review (PO/CEO), edit/reselect — контент с ~48px отступом справа, скролл работает.

---

## Bug 2 — Top/bottom fixed areas (Medium)

**Figma:** верхняя и нижняя «фиксированные» зоны левой колонки съедают высоту.

**Корень:** [`BriefShellView.vue`](../../packages/constructor/src/views/BriefShellView.vue) + [`ConstructorDualPaneShell.vue`](../../packages/constructor/src/components/constructor/layout/ConstructorDualPaneShell.vue) — `pt-12 pb-12` внутри scroll при отдельном footer.

**Исправление:**

- Убрать `pb-12` у wizard scroll-области.
- Уменьшить `pt-12` → `pt-8` или перенести padding на inner wrapper.
- Опционально: вынести wizard header из scroll в `shrink-0` блок.

**Scope:** cross-step wizard layout (1–7). Review/edit — см. ниже.

**Сделано (review + edit, step 8):**

- Убран `p-12` / `px-12` с review shell — горизонтальный inset на scroll-контейнере в [`ReviewUnifiedView.vue`](../../packages/constructor/src/components/constructor/review/ReviewUnifiedView.vue).
- `pt-12 pb-12` перенесены на `__scroll-inner` — верх/низ **скроллятся вместе с контентом**, нет фиксированных серых полос.

**Осталось (wizard 1–7):**

- Убрать `pb-12` у wizard scroll-области.
- Уменьшить `pt-12` → `pt-8` или перенести padding на inner wrapper.
- Опционально: вынести wizard header из scroll в `shrink-0` блок.

---

## Bug 3 — Sidebar не на всю ширину preview (High)

**Figma:** открытый sidebar не перекрывает всю ширину экрана в превью.

**Корень:** geometry + assets — [`useBrandPreviewLayers.ts`](../../packages/constructor/src/composables/useBrandPreviewLayers.ts), разные mockup insets в [`StepPreviewRightPanel.vue`](../../packages/constructor/src/components/constructor/layout/StepPreviewRightPanel.vue) vs [`BrandPreviewPanel.vue`](../../packages/constructor/src/components/constructor/preview/BrandPreviewPanel.vue), Type 2 asset не full-bleed.

**Исправление:**

- Унифицировать mockup insets в одну константу.
- Sidebar slot = 100% ширины phone viewport.
- Перегенерировать Type 2 под 289×614 full-bleed.

**Scope:** step 7 + step 8.

**Реализация (done):**

- `9498704` — split preview layers, sidebar status-bar inset (`PHONE_STATUS_BAR_INSET_PX`), Type 3 exception.
- `278c08b` — sidebar slide animation (select/deselect/toggle) на step 7.
- `67a595a` — `object-cover object-top` для layer images в preview.
- [`useBrandPreviewLayers.ts`](../../packages/constructor/src/composables/useBrandPreviewLayers.ts) — `SIDEBAR_BASE_SLOT` full viewport (`288.75×614.25`, `left: 0`).
- [`StepPreviewRightPanel.vue`](../../packages/constructor/src/components/constructor/layout/StepPreviewRightPanel.vue) — step 7 layered preview + sidebar overlay.
- [`BrandPreviewPanel.vue`](../../packages/constructor/src/components/constructor/preview/BrandPreviewPanel.vue) — step 8 dual-phone preview.

**Как проверить:** step 7 / step 8 — Sidebar Type 1/2/3 на всю ширину phone viewport в превью.

---

## Bug 4 — Лишний нижний отступ без комментариев (Low)

**Figma:** «За відсутності коментарів у картках залишається надмірний відступ у нижній частині.»

**Скрин / контекст:** PO Final review (step 8), секции без комментариев — лишние ~16px снизу карточки.

**Корень (Final review, step 8):**

- [`ReviewUnifiedView.vue`](../../packages/constructor/src/components/constructor/review/ReviewUnifiedView.vue) всегда монтирует `<SectionCommentBlock>` в `#comment` для каждой из 7 секций.
- [`SectionCommentBlock.vue`](../../packages/constructor/src/components/constructor/fields/SectionCommentBlock.vue) рендерил пустой `<div class="section-comment">`, когда в `po-draft` нет PO/CEO текста.
- [`ReviewSection.vue`](../../packages/constructor/src/components/constructor/review/ReviewSection.vue) — `__body` с `gap-4` между rows и comment slot; пустой flex-child всё равно давал gap.

**Исправление (done):**

- [`sectionCommentBlockVisibility.ts`](../../packages/constructor/src/utils/sectionCommentBlockVisibility.ts) — `isSectionCommentBlockVisible`: PO текст / CEO editable / resolve UI / alwaysExpanded / persisted CEO.
- `SectionCommentBlock`: `v-if="isVisible"` на корне + `mt-4` только когда блок виден.
- `ReviewSection`: `__content` с `gap-4` для rows; comment slot вне gap.

**Scope:** Final review (step 8) — primary. Wizard step 7 (`StepCommentField`, аккордеоны) — **не входит**; отдельная задача при необходимости.

**Комментарии не теряются:** `getAuthorCommentForSection` и `sectionCommentBindings` не менялись; CEO CTA на `ceo`, resolve UI на `po-returned`, read-only на `approved`/`ceo-frozen` сохранены через матрицу видимости.

**Тесты:** [`sectionCommentBlockVisibility.test.ts`](../../packages/constructor/tests/unit/utils/sectionCommentBlockVisibility.test.ts).

**Как проверить:**

1. PO draft step 8 — секции без комментариев: нет лишнего padding снизу.
2. Добавить комментарий на wizard step → на review он виден в нужной секции.
3. CEO review — dashed CTA на каждой секции + general comment expanded.
4. PO returned — CEO section comments + resolve UI + general block.
5. Approved / po-submitted / ceo-frozen — read-only PO и CEO комментарии на месте.

**Статус:** done — коммит `76168a8`.

---

## Bug 5 — «Переглянути» = «Редагувати» (Low)

**Figma:** «Переглянути» — link-style, без pill как у «Редагувати».

**Файлы:** [`ReviewExternalNamingsList.vue`](../../packages/constructor/src/components/constructor/review/ReviewExternalNamingsList.vue), [`ReviewInternalNamingBlock.vue`](../../packages/constructor/src/components/constructor/review/ReviewInternalNamingBlock.vue), [`ReviewPrPackageBlock.vue`](../../packages/constructor/src/components/constructor/review/ReviewPrPackageBlock.vue), [`reviewActionClasses.ts`](../../packages/constructor/src/components/constructor/review/reviewActionClasses.ts).

**Scope:** step 8 review.

**Исправление (done):**

- `REVIEW_PREVIEW_LINK_BUTTON_CLASS`: без pill (`h-10`, `rounded-lg`, `hover:bg`); текст `#373737`, 14px; hover `opacity-70` (не underline).
- `ReviewPrPackageBlock`: `items-center` на строке title + «Переглянути» (Figma: 24px row, icon+text по центру).
- Header «Редагувати» в `ReviewSection` — без изменений (pill + hover bg).

**Статус:** done.

---

## Bug 6 — Дубли «Закрити» и × в модалке (Medium)

**Figma:** убрать footer «Закрити», оставить × / backdrop / Esc.

**Файл:** [`BriefModalShell.vue`](../../packages/constructor/src/components/constructor/modals/BriefModalShell.vue) — readonly preview показывал и ×, и footer «Закрити».

**Scope:** все модалки на `BriefModalShell` (PR preview, brief preview concept/external/internal, edit через `New*Modal`).

**Исправление (done):**

- `showFooter`: footer только если `!readonly` (Скасувати + Зберегти) или `readonly && showEditAction` (только «Редагувати»).
- `readonly && !showEditAction` (PR на review, brief на final review) — **без footer**; закрытие: ×, backdrop, Esc.

**Не затронуто:** `ConfirmationModal`, `MarketingPackageView` detail, `VisualComponentsView` delegate — отдельные shell'ы.

**Статус:** done.

---

## Bug 7 — Empty state при delegateToDesigners (Medium)

**Figma:** один iPhone с текстом «Компоненти буде визначено дизайн-командою»; в обычном режиме — два iPhone.

**Корень:** `BrandPreviewPanel` не ветвил delegate (всегда два телефона); геометрия viewport расходилась между step 7 и review.

**Исправление (done):**

- `iphoneVisualPreview.ts` + `VisualComponentsIphoneFrame.vue` — единая геометрия frame/viewport.
- `VisualComponentsPhoneEmptyState.vue` — `delegated` | `pick-components`; empty `border-radius` из той же константы.
- Step 7 + Final review переиспользуют те же компоненты; delegate на review → один iPhone.
- `brandHydration.ts` — merge `delegateToDesigners` из колонки бренда при загрузке `stepData`.
- Удалён мёртвый fallback `NO_VISUAL_COMPONENTS_SELECTED_MESSAGE` / `not-selected` (wizard не пускает на review без selections).

**Статус:** done.

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
- **Bug 1:** left-pane scroll gutter (`pl-12 pr-3` + `pr-9`) + `.left-pane-scroll` — wizard, review, edit (`5782b9b`, `12d1dae`)
- **Bug 2 (partial):** review step 8 + edit — vertical pad внутри scroll (`ReviewUnifiedView__scroll-inner`, `12d1dae`)
- **Bug 3:** sidebar full-width preview — layers, slide, `object-cover` (`9498704`, `278c08b`, `67a595a`)

---

## QA checklist

1. Step 7: scroll аккордеонов — scrollbar справа, не контрастный — **done (Bug 1)**
2. Step 7: footer не «съедает» высоту списка компонентов — **pending (Bug 2 wizard)**
3. Step 8 review: нет фиксированных top/bottom полос при скролле — **done (Bug 2)**
4. Sidebar Type 1/2/3 — full width в preview — **done (Bug 3)**
5. Step 8 review: секции без комментариев — нет лишнего bottom padding — **done (Bug 4)**; step 7 wizard — отдельно при необходимости
6. Delegate toggle — один iPhone при delegate, два при выборе компонентов — **done (Bug 7)**
7. Brief readonly modal — один способ закрытия (× / backdrop / Esc), без footer «Закрити» — **done (Bug 6)**
8. Review — «Переглянути» визуально слабее «Редагувати» — **done (Bug 5)**
9. Смена concept → external naming сброшен, redirect на step 3 — **pending (Bug 8)**
