# UXUI-2553 — Postmortem: «Переглянути контейнер» (fluid shell)

**Статус:** работа **отменена**, код **не закоммичен**, рабочее дерево откачено к `dfab591`.  
**Дата фиксации:** 2026-07-22.  
**Решение продукта:** отложить до интеграции wizard в admin; вероятно, задача **не понадобится** в новом контексте.

---

## 1. Ссылки на Figma

| Что | Node ID | Ссылка |
|-----|---------|--------|
| Design Review (раздел задачи) | `4684-19688` | [Brand-Builder → Design Review](https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=4684-19688&m=dev) |
| Таблица багов / комментарии | `4684-19689` | [Design Review table](https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=4684-19689&m=dev) |
| Wide screen layout (5 якорей) | `4684-22333` | [Wide screen examples](https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=4684-22333&m=dev) |
| Общий контекст багов (ранний обзор) | `2827-2644` | [Design bugs overview](https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=2827-2644&m=dev) |

**File key:** `aCe1cUDNaA7Tmcn9Mmvv1w` (Brand-Builder)

---

## 2. Описание бага (от дизайнера Marharyta)

Два связанных дефекта dual-pane shell wizard (`BriefShellView` → `ConstructorDualPaneShell`):

### Bug A — вертикальный inset (~20px)

На **1440×900** (и рядом) shell прилипает к верху и низу viewport. В Figma между краями экрана и карточкой shell — **~20px** сверху и снизу.

**Подтверждено на prod** до начала работ.

### Bug B — wide screens: шире контейнер, 4 карточки концептов

На широких экранах (от ~1440+) shell должен:

- расширяться по ширине (не оставаться на фиксированных 1440px),
- иметь **фиксированные px-ширины** левой и правой колонок из таблицы Figma,
- показывать **4 карточки концептов** в Concept Selection **того же размера** (~148px), за счёт **расширения левой колонки**, а не уменьшения карточек,
- иметь **cap** max-width на самых широких экранах (1920 → shell 1580px).

**Scope по Figma:** Concept Selection (шаг выбора концепта). Naming grids (3 колонки, `max-w-[506px]`) в макете wide layout **не менялись**.

---

## 3. Якорные breakpoints из Figma (`4684-22333`)

| Viewport W×H | Shell W×H | Left col | Right col | Phone preview |
|--------------|-----------|----------|-----------|---------------|
| 1280×720 | 1240×680 | 600 | 640 | 560 |
| 1440×768 | 1400×728 | 712 | 688 | 608 |
| 1512×820 | 1430×780 | 690 | 740 | 660 |
| 1728×900 | 1530×860 | 710 | 820 | 740 |
| 1920×920 | 1580×880 | 740 | 840 | 760 |

Между якорями — **piecewise linear interpolation** по оси viewport width (и отдельно по height для shell height).

---

## 4. Baseline до UXUI-2553 (что было в коде)

- Фиксированный design canvas **1440×900** (`layoutShell.ts`, `useViewportScale.ts`).
- Масштаб всего shell через `transform: scale()` от `min(vw/1440, vh/900, 1)`.
- Колонки: **42% / 58%** (`dualPaneLayoutClasses.ts`), не px из Figma.
- Concept grid: **3 колонки**, `max-w-[506px]`.
- Preview phone: фиксированный размер, без интерполяции.

Последний коммит до работ: `dfab591` — `fix(BRIEF-031): remove CEO gate back button`.

---

## 5. Попытка 1 — «Fluid mode» (отклонена)

### Идея

Два режима в `useShellLayout`:

1. **Fluid** — `scale = 1`, реальные px shell/columns из lerp Figma, отдельный upscaling iPhone frame (`previewPhoneSize`).
2. **Scale** — legacy 1440×900 + transform scale (для узких viewport).

### Что добавили (не закоммичено)

| Файл | Назначение |
|------|------------|
| `constants/layoutShellBreakpoints.ts` | 5 якорей Figma |
| `utils/lerpBreakpoints.ts` | `lerp1d()` |
| `composables/useShellLayout.ts` | Fluid + Scale modes |
| `composables/shellLayoutContext.ts` | provide/inject типы |
| `composables/useInjectedShellLayout.ts` | inject helper |
| Refactor `ConstructorDualPaneShell`, `dualPaneLayoutClasses` | px dimensions |
| `ConceptGrid`, `ConceptGridSkeleton` | 3/4 cols |
| `VisualComponentsIphoneFrame`, `LayoutPreviewOverlays` | preview phone scaling |
| Vitest на якорях и midpoints | |

### Почему не пошло

- **Регрессии preview:** iPhone обрезался на step 7, slider с `object-cover` «плавал» при resize по высоте.
- **Две системы layout** (fluid internal px + scale fallback) — ощущение «костыля», сложно QA.
- Смешение `%` и px в разных режимах ломало предсказуемость.

**Вердикт:** пользователь отклонил подход, попросил вернуться к единому scaled canvas.

---

## 6. Попытка 2 — «Scaled canvas v2» (частично, тоже отменена)

### Идея

Одна система — evolution of `useViewportScale`:

1. **Design canvas width** — lerp из 5 Figma anchors (1240 → 1580).
2. **Design canvas height** — фикс **900px** (стабильные пропорции slider/phone).
3. **Fit:** `scale = min((vw − gutter) / shellW, (vh − 40) / 900, 1)` с **20px** vertical inset.
4. **4 cols** в ConceptGrid когда `shellWidth >= 1400`.

### Что получилось

- ✅ Вертикальный inset ~20px на 1440×900.
- ✅ Shell шире на wide screens.
- ✅ 4 колонки в Concept Selection (технически).
- ✅ Тесты проходили (100 passing).

### Что **не** совпало с Figma

| Ожидание дизайна | Факт в коде |
|------------------|-------------|
| Левая колонка **712px** @ 1440 | Остались **42%/58%** |
| 4 карточки **того же размера** (~148px) | 4 cols через **уменьшение** карточек |
| Shell height **728px** @ 1440×768 | Фикс **900px** + scale |
| Interpolated `previewPhoneSize` | Не использовался во 2-й попытке |
| Naming grids на wide | Не трогали (корректно по scope) |

**Вердикт:** визуально «не Figma»; пользователь решил **не доводить**, а переключиться на интеграцию wizard в admin.

---

## 7. Почему отложили (и, возможно, не вернёмся)

### Интеграция wizard в admin (Variant 3)

См. [`docs/architecture/variant-3-implementation-plan.md`](../architecture/variant-3-implementation-plan.md):

- **Рекомендуемое ядро:** один origin, admin на `/`, wizard на `/wizard/*`.
- **Preview-scale не трогаем** на этапе-ядре — wizard остаётся в своём бандле с Tailwind.
- У admin **своя левая панель**; wizard встраивается в content area, а не fullscreen standalone shell.

**Логика продукта:** когда wizard живёт внутри admin chrome, отдельный «fluid fullscreen container» с собственными отступами viewport **может быть не нужен** — layout определяется admin shell, как wireframe-in-frame.

### Prod deploy

Во время работы на prod мог уехать **fluid/scaled** build (незакоммиченные изменения + `deploy:all`). После отката локально — **нужен redeploy** с чистого `dfab591`, если prod сломан.

---

## 8. Затронутые файлы (вся работа — uncommitted, откачена)

### Новые (удалены при revert)

- `packages/constructor/src/composables/useShellLayout.ts`
- `packages/constructor/src/composables/shellLayoutContext.ts`
- `packages/constructor/src/composables/useInjectedShellLayout.ts`
- `packages/constructor/src/constants/layoutShellBreakpoints.ts`
- `packages/constructor/src/utils/lerpBreakpoints.ts`
- `packages/constructor/tests/unit/composables/useShellLayout.test.ts`
- `packages/constructor/tests/unit/utils/lerpBreakpoints.test.ts`

### Изменённые (restored to HEAD)

- `packages/constructor/src/views/BriefShellView.vue` — обратно `useViewportScale`
- `packages/constructor/src/components/constructor/layout/ConstructorDualPaneShell.vue`
- `packages/constructor/src/components/constructor/layout/dualPaneLayoutClasses.ts`
- `packages/constructor/src/components/constructor/layout/StepPreviewRightPanel.vue`
- `packages/constructor/src/components/constructor/alternative-selection/ConceptGrid.vue`
- `packages/constructor/src/components/constructor/skeletons/ConceptGridSkeleton.vue`
- `packages/constructor/src/constants/layoutShell.ts`

### Не входило в UXUI (не трогали при revert)

- `docs/design-audit/figma-visual-components-bugs.md` — отдельный doc sync (Bug 8)
- `packages/worker/.tmp/prod-dump.sql`

---

## 9. Если вернуться к задаче позже

### Минимальный fix только Bug A (inset 20px)

Правка в `useViewportScale` / wrapper в `BriefShellView`: subtract 40px from available height before scale. **~5 строк**, без fluid breakpoints.

### Полный fix Bug A + B (pixel-perfect Figma)

1. **Один** scaled canvas OR **один** fluid canvas — не оба.
2. Lerp **shell width + shell height + leftWidth + rightWidth + previewPhoneSize** из таблицы §3.
3. Заменить 42%/58% на **px columns** внутри design canvas.
4. 4 cols ConceptGrid при достаточной `leftWidth`, карточки **fixed ~148px**.
5. QA matrix: 1280×720, 1440×900, 1512×820, 1728×900, 1920×920, resize height, step 7 phone, slider.

### Переоценка после admin integration

Перед реализацией — проверить, нужен ли fullscreen fluid shell, когда wizard в admin content area с sidebar.

---

## 10. Хронология

| Дата | Событие |
|------|---------|
| 2026-07-22 | Анализ Figma `2827-2644`, `4684-19688` |
| 2026-07-22 | Попытка 1: Fluid + Scale dual mode → регрессии preview |
| 2026-07-22 | Попытка 2: Scaled canvas v2 → частичный fix, не pixel-perfect |
| 2026-07-22 | Решение: postmortem + полный revert, приоритет — admin integration |

---

## 11. Связанные документы

- [`variant-3-implementation-plan.md`](../architecture/variant-3-implementation-plan.md) — план admin + wizard
- [`figma-visual-components-bugs.md`](./figma-visual-components-bugs.md) — другие баги wizard (не UXUI-2553)
