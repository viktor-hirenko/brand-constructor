# DP-15859 — набор иконок Phosphor в админке и визарде

**Это трекер задачи.** Он читается в начале каждой сессии по DP-15859 и
обновляется после каждого шага. Правила проекта — `AGENTS.md`, текущее
состояние всей работы — `docs/STATE.md` (он только ссылается сюда).

| | |
|---|---|
| Jira | https://upstars.atlassian.net/browse/DP-15859 |
| Таблица соответствий | [`5658:39934`](https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=5658-39934&m=dev) — секция «Icons»: набор `3261:907`, компонент `Icon` `3261:909`, таблица `5658:39246` |
| Меню админки на экране | [`5382:44766`](https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=5382-44766&m=dev), компонент `Sidebar` `5382:30672` внутри |
| Витрина для владельца | https://claude.ai/artifact/RZgdrxYnTD1KTbMKJjE4ju |
| Строк в таблице | **47** — пересчёт ниже |

## Текст Jira дословно

> Потрібно підключити Phosphor Icons https://phosphoricons.com/ як стандартний
> набір іконок для Brand Builder. Та замінити поточні іконки новими (в Admin та
> Wizard) відповідно до підготовленого мапінгу у Figma.
>
> Goal/Pain/Task: Єдиний набір має покращити роботу з UI для дизайну та
> розробки, забезпечити консистентність, спростити майбутнє масштабування
> проєкту.

Плюс команда владельца 29.09: иконки левого меню админки (строка 110
`dp-15258-divergences.md`) — в этой же задаче, одним трекером.

---

## Развилка «пакет или пути вручную» — ЗАМЕРЕНО И РЕШЕНО 29.09

**Решение: пакет `@phosphor-icons/core` 2.1.1 (MIT), подключён в `admin` и
`constructor`.** Иконка берётся файлом пакета нужного веса
(`@phosphor-icons/core/regular/tag.svg?raw`), рисунок из него достаёт
`phosphorPaths()` в `packages/shared/src/utils/phosphorGlyph.ts`.

Что мерили — по выложенным файлам `deploy/unified/public`, gzip -9, сумма всех
`.js` и `.css`:

| Что | Админка `assets/` | Визард, главный файл `wizard/assets/index-*.js` |
|---|---|---|
| До задачи | 100 214 | 54 943 |
| Официальный Vue-пакет `@phosphor-icons/vue` 2.2.1, 6 иконок меню | **107 351 (+7 137)** | — |
| Тот же Vue-пакет, 46 иконок визарда (пробная сборка, откачена) | — | **94 715 (+39 772)** |
| `@phosphor-icons/core`, 6 иконок меню — **выложено, шаг 1** | **101 856 (+1 642)** | 54 943 (не менялся) |

Почему так: компонент Vue-пакета несёт **все шесть весов** своей иконки
(regular, thin, light, bold, fill, duotone), то есть ~4 КБ на иконку вместо
~0,4. Отсечение неиспользуемого работает у обоих пакетов — в сборку попали
только названные иконки, проверено поиском пути `Acorn` в выложенном js.

Для визарда — сравнение рисунков одного и того же набора из 46 иконок:
пути, вклеенные сейчас из экспорта Figma, — **65 836 байт, 25 508 сжатыми**;
те же иконки из `@phosphor-icons/core` — **21 397, 6 422 сжатыми**. Экспорт
Figma пишет координаты с пятью знаками после запятой на боксе 24, пакет — с
двумя на боксе 256. Рисунок один и тот же: `Tag` Figma начинается
`M19.0086 10.625` на боксе 20, пакета — `M243.31,136` на 256; 243.31 × 20 / 256
= 19.0086.

**Работает ли в админке без Tailwind:** да. Иконка — обычный `<svg>` с
`fill="currentColor"`, размер задаёт класс вызывающего, в админке это SCSS.

**Что отклонено и почему:**

- `@phosphor-icons/vue` — +40 КБ сжатыми к главному файлу визарда (рост на 72 %)
  без единого видимого отличия. Его удобство (проп `weight`) заменяет папка в
  пути импорта.
- Дальше вклеивать пути вручную — задача прямо говорит «підключити як
  стандартний набір», а вклейка тяжелее пакета вчетверо.

**Грабля, найденная на замере:** у залитого веса в пакете другое имя файла —
`fill/tag-fill.svg`, не `fill/tag.svg`. Для строк с весом Fill (`CaretUp`,
`CaretDown`, `Eye`, `CheckCircle`, `WarningCircle`) импорт пишется с `-fill`.

---

## Счёт

**47 строк таблицы `5658:39246`** + 1 строка вне таблицы (Users, решение
владельца). Пересчёт по таблице ниже:

```
grep -cE '^\| [0-9]+ \|' docs/design-audit/dp-15859-icons.md          # 48 = 47 + Users
grep -cE '^\| [0-9]+ \|.*\| \*\*закрыто' docs/design-audit/dp-15859-icons.md
grep -cE '^\| [0-9]+ \|.*\| \*\*места нет' docs/design-audit/dp-15859-icons.md
```

На 29.09, задача закрыта: **42 закрыто** (5 строк меню + Users, 36 строк
визарда) · **6 места нет**. 42 + 6 = 48.

Сколько файлов визарда нарисовано Phosphor —
`grep -rln 'Phosphor \`' packages/constructor/src/components/icons/*.vue | wc -l`
→ **36** из `ls packages/constructor/src/components/icons/*.vue | wc -l` → **45**.
Из них берут рисунок из пакета —
`grep -l "@phosphor-icons/core/" packages/constructor/src/components/icons/*.vue | wc -l`
→ **36**; вклеенных путей в них —
`grep -l ' d="' $(grep -l "@phosphor-icons/core/" packages/constructor/src/components/icons/*.vue) | wc -l`
→ **0**.
Девять без пары в ките: `ClockIcon`, `CornerUpLeftIcon`, `DownloadIcon`,
`FileIcon`, `LoaderIcon`, `PackageIcon`, `RevisionReturnIcon`, `SendIcon`,
`ShareIcon` (список ведёт `kitIconSet.test.ts`).

---

## Таблица соответствий `5658:39246` — полностью

Колонки дизайнера: `Use case · Current · → · Phosphor · Phosphor name · Weight`.
«Вариант использования» — её первая колонка **дословно**. Размер и цвет у
дизайнера в таблице не заданы — они задаются местом (экраном), см. колонку
«Размер и цвет по макету».

### Admin sidebar

| # | Вариант использования | Было | Phosphor | Вес | Размер и цвет по макету | Где у нас в коде | Состояние |
|---|---|---|---|---|---|---|---|
| 1 | Brands | ♦ `&#9830;` | `Tag` | Regular | 20×20, цвет подписи: белый у активного, у остальных белый 60 % (`5382:30672`) | `admin/src/components/ui/AppSidebar.vue` → `regular/tag.svg` | **закрыто** (шаг 1, Pages `976603cb`, `016e752`) |
| 2 | Concepts | ◈ `&#9672;` | `Lightbulb` | Regular | то же | `AppSidebar.vue` → `regular/lightbulb.svg` | **закрыто** (шаг 1, Pages `976603cb`, `016e752`) |
| 3 | Namings | ✎ `&#9998;` | `TextAa` | Regular | то же | `AppSidebar.vue` → `regular/text-aa.svg` | **закрыто** (шаг 1, Pages `976603cb`, `016e752`) |
| 4 | PR Packages | ★ `&#9733;` | `Megaphone` | Regular | то же | `AppSidebar.vue` → `regular/megaphone.svg` | **закрыто** (шаг 1, Pages `976603cb`, `016e752`) |
| 5 | UI Components | ▦ `&#9638;` | `SquaresFour` | Regular | то же | `AppSidebar.vue` → `regular/squares-four.svg` | **закрыто** (шаг 1, Pages `976603cb`, `016e752`) |
| 6 | *Users — строки в таблице нет* | ♟ `&#9823;` | `Users` | Regular | то же | `AppSidebar.vue` → `regular/users.svg` | **закрыто** (шаг 1, Pages `976603cb`, `016e752`). Выбор владельца 29.09 — «Два человечка» |

### Wizard — semantic icons

«Файл» — наша обёртка в `packages/constructor/src/components/icons/`. До шага 2
её рисунок был вклеен DP-15258 из экспорта Figma, теперь он берётся файлом
пакета; привязку к месту пинит `kitIconPlacement.test.ts`, файл и вес —
`kitIconSet.test.ts`.

| # | Вариант использования | Было | Phosphor | Вес | Размер и цвет по макету | Где у нас в коде | Состояние |
|---|---|---|---|---|---|---|---|
| 7 | Креативні концепти | свой рисунок | `Swatches` | Regular | задан экраном, сверен DP-15258 | `SwatchesIcon` — `LandingView` | **закрыто** (шаг 2, Pages `e896196f`, `aa84510`) — рисунок из пакета |
| 8 | Неймінги | свой рисунок | `TextAa` | Regular | то же | `TextAaIcon` — `LandingView` | **закрыто** (шаг 2, Pages `e896196f`, `aa84510`) — рисунок из пакета |
| 9 | UI рішення | свой рисунок | `FigmaLogo` | Regular | то же | `FigmaLogoIcon` — `LandingView` | **закрыто** (шаг 2, Pages `e896196f`, `aa84510`) — рисунок из пакета |
| 10 | Маркетінговий розвіток | свой рисунок | `TrendUp` | Regular | то же | `TrendingUpIcon` — `LandingView` | **закрыто** (шаг 2, Pages `e896196f`, `aa84510`) — рисунок из пакета |
| 11 | GEO | свой рисунок | `Globe` | Regular | то же | `GlobeIcon` — `BrandBasicsView`, `UiFieldLabel`, `UiProperty`, `StepPreviewRightPanel`, `ReviewUnifiedView` | **закрыто** (шаг 2, Pages `e896196f`, `aa84510`) — рисунок из пакета |
| 12 | Date | `date` | `CalendarBlank` | Regular | то же | `CalendarIcon` — `DatePicker`, `BrandBasicsView`, `DeliverablesView`, `StepPreviewRightPanel`, `ReviewUnifiedView`, `ReviewDeliverablesBlock` | **закрыто** (шаг 2, Pages `e896196f`, `aa84510`) — рисунок из пакета |
| 13 | Звʼязок з іншим продуктом | свой рисунок | `Link` | Regular | то же | `LinkIcon` — `BrandBasicsView`, `StepPreviewRightPanel`, `ReviewUnifiedView` | **закрыто** (шаг 2, Pages `e896196f`, `aa84510`) — рисунок из пакета |
| 14 | Коментар | `comment` | `ChatCircleText` | Regular | то же | `ChatBubbleIcon` — `StepCommentField`, `ReviewUnifiedView` | **закрыто** (шаг 2, Pages `e896196f`, `aa84510`) — рисунок из пакета |
| 15 | Тема | `sun` | `Palette` | Regular | то же | `PaletteIcon` — `ReviewConceptBlock` | **закрыто** (шаг 2, Pages `e896196f`, `aa84510`) — рисунок из пакета |
| 16 | PR Packages | `pr-package` | `Megaphone` | Regular | то же | `MegaphoneIcon` — `UiProperty`, `ReviewPrPackageBlock` | **закрыто** (шаг 2, Pages `e896196f`, `aa84510`) — рисунок из пакета |
| 17 | Trust Focus | свой рисунок | `ShieldCheck` | Regular | то же | `ShieldCheckIcon` — `MarketingPackageView`, пакет 1 | **закрыто** (шаг 2, Pages `e896196f`, `aa84510`) — рисунок из пакета |
| 18 | Social Trust | свой рисунок | `UsersThree` | Regular | то же | `UsersThreeIcon` — `MarketingPackageView`, пакет 2 | **закрыто** (шаг 2, Pages `e896196f`, `aa84510`) — рисунок из пакета |
| 19 | Full Reputation | свой рисунок | `Star` | Regular | то же | `StarIcon` — `MarketingPackageView`, пакет 3 | **закрыто** (шаг 2, Pages `e896196f`, `aa84510`) — рисунок из пакета |
| 20 | Media Reputation | свой рисунок | `NewspaperClipping` | Regular | то же | `NewspaperClippingIcon` — `MarketingPackageView`, пакет 4 | **закрыто** (шаг 2, Pages `e896196f`, `aa84510`) — рисунок из пакета |
| 21 | Brand Excellence | свой рисунок | `Trophy` | Regular | то же | `TrophyIcon` — `MarketingPackageView`, пакет 5 | **закрыто** (шаг 2, Pages `e896196f`, `aa84510`) — рисунок из пакета |
| 22 | Total Market Presence | свой рисунок | `GlobeHemisphereWest` | Regular | то же | `GlobeHemisphereWestIcon` — `MarketingPackageView`, пакет 6 | **закрыто** (шаг 2, Pages `e896196f`, `aa84510`) — рисунок из пакета |
| 23 | Legal Landing | `deliverables` | `Scales` | Regular | то же | `DeliverablesScopeIcon` — `DeliverablesView`, `ReviewDeliverablesBlock` | **закрыто** (шаг 2, Pages `e896196f`, `aa84510`) — рисунок из пакета |
| 24 | Partner Landing | свой рисунок | `Handshake` | Regular | то же | `HandshakeIcon` — `DeliverablesView` | **закрыто** (шаг 2, Pages `e896196f`, `aa84510`) — рисунок из пакета |
| 25 | Placeholder | свой рисунок | `ImageSquare` | Regular | то же | `ImagePlaceholderIcon` — `ConceptPreviewSlider`, `ConceptMobilePreview`, `ConceptCard` | **закрыто** (шаг 2, Pages `e896196f`, `aa84510`) — рисунок из пакета |
| 26 | Sparkles | свой рисунок | `Sparkle` | Regular | то же | `SparklesIcon` — `LandingView`, `LandingDraftCta`, `StepPreviewRightPanel`, `ReviewVisualComponentsBlock`, `BrandPreviewPanel` | **закрыто** (шаг 2, Pages `e896196f`, `aa84510`) — рисунок из пакета |
| 27 | Magic wand | `magic-wand` | `MagicWand` | Regular | то же | `MagicWandIcon` — `VisualComponentsView` | **закрыто** (шаг 2, Pages `e896196f`, `aa84510`) — рисунок из пакета |

### Controls

| # | Вариант использования | Было | Phosphor | Вес | Размер и цвет по макету | Где у нас в коде | Состояние |
|---|---|---|---|---|---|---|---|
| 28 | Chevron right | `chevron-right` | `CaretRight` | Regular | задан экраном | `ChevronRightIcon` — `DatePicker` | **закрыто** (шаг 2, Pages `e896196f`, `aa84510`) — рисунок из пакета |
| 29 | Chevron left | `chevron-left` | `CaretLeft` | Regular | то же | `ChevronLeftIcon` — `DatePicker` | **закрыто** (шаг 2, Pages `e896196f`, `aa84510`) — рисунок из пакета |
| 30 | Chevron up | `chevron-up` | `CaretUp` | Regular | — | файла нет | **места нет** в визарде: шеврон аккордеона — `CaretDown`, повёрнутый. В админке — см. опись ниже |
| 31 | Caret up | `chevron-up-solid` | `CaretUp` | **Fill** | — | файла нет | **места нет** в визарде (строка 83 `dp-15258-divergences.md`). В админке — см. опись |
| 32 | Chevron down | `chevron-down` | `CaretDown` | Regular | то же | `CaretDownIcon` — `UiAccordionItem`, `LandingDraftCta`, `BriefOrderButton` | **закрыто** (шаг 2, Pages `e896196f`, `aa84510`) — рисунок из пакета |
| 33 | Caret down | `chevron-down-solid` | `CaretDown` | **Fill** | — | файла нет | **места нет** в визарде (строка 83). В админке — см. опись |
| 34 | Arrow right | `arrow-right` | `ArrowRight` | Regular | то же | `ArrowRightIcon` — `ConceptPreviewSlider` | **закрыто** (шаг 2, Pages `e896196f`, `aa84510`) — рисунок из пакета |
| 35 | Arrow left | `arrow-left` | `ArrowLeft` | Regular | то же | `ArrowLeftIcon` — `UiIconButton`, `ConceptPreviewSlider` | **закрыто** (шаг 2, Pages `e896196f`, `aa84510`) — рисунок из пакета |
| 36 | Check | `check` | `Check` | Regular | то же | `CheckIcon` — 12 файлов (`UiCheckbox`, `UiListItem`, `GeoMultiSelect`, `ConceptCard`, …) | **закрыто** (шаг 2, Pages `e896196f`, `aa84510`) — рисунок из пакета |
| 37 | Plus | `plus` | `Plus` | Regular | то же | `PlusIcon` — `BriefOrderButton`, `SectionCommentBlock` | **закрыто** (шаг 2, Pages `e896196f`, `aa84510`) — рисунок из пакета |
| 38 | Close | `close` | `X` | Regular | то же | `CloseIcon` — `UiModal`, `UiWizardHeader`, `ConceptPreviewPopup`, `PrPackagePreviewPopup`, … | **закрыто** (шаг 2, Pages `e896196f`, `aa84510`) — рисунок из пакета |
| 39 | Редагувати | `pen` | `PencilSimple` | Regular | то же | `PencilIcon` — `ReviewSection` | **закрыто** (шаг 2, Pages `e896196f`, `aa84510`) — рисунок из пакета |
| 40 | Expand | `expand` | `ArrowsOutSimple` | Regular | то же | `MaximizeIcon` — `ConceptPreviewSlider` | **закрыто** (шаг 2, Pages `e896196f`, `aa84510`) — рисунок из пакета |
| 41 | Змінити вибір | `change` | `ArrowsClockwise` | Regular | то же | `RefreshIcon` — `ReviewSection` | **закрыто** (шаг 2, Pages `e896196f`, `aa84510`) — рисунок из пакета |
| 42 | Переглянути / Показати | `eye` | `Eye` | Regular | то же | `EyeIcon` — `UiLink`, блоки ревью, `ConceptCard`, `VisualComponentsView` | **закрыто** (шаг 2, Pages `e896196f`, `aa84510`) — рисунок из пакета |
| 43 | Переглянути hovered | `filled/eye` | `Eye` | **Fill** | — | файла нет | **места нет** в визарде (строка 83): глаз на карточке при наведении не меняется. Проверить на шаге 2 по макету карточки |
| 44 | Приховати | `eye-off` | `EyeSlash` | Regular | то же | `EyeSlashIcon` — `VisualComponentsView` | **закрыто** (шаг 2, Pages `e896196f`, `aa84510`) — рисунок из пакета |

### Status icons

| # | Вариант использования | Было | Phosphor | Вес | Размер и цвет по макету | Где у нас в коде | Состояние |
|---|---|---|---|---|---|---|---|
| 45 | Check circle | `check-circle` | `CheckCircle` | Regular | задан экраном | `CheckBadgeIcon` — `ReviewHeader` | **закрыто** (шаг 2, Pages `e896196f`, `aa84510`) — рисунок из пакета |
| 46 | Check circle filled | `filled/check-circle` | `CheckCircle` | **Fill** | — | файла нет | **места нет** в визарде (строка 83). В админке — см. опись |
| 47 | Exclamation circle | `exclamation-circle` | `WarningCircle` | Regular | — | файла нет | **места нет** в визарде: все алерты визарда — Fill. В админке — см. опись |
| 48 | Exclamation circle filled | `filled/exclamation-circle` | `WarningCircle` | **Fill** | то же | `InfoCircleFilledIcon` — `UiAlert`, `StatusPillBadge`, `PreviewPanelToast`, `ReviewHeader`, `SupervisorActionsFooter`, `SupervisorBriefGateView`, `VisualComponentsView` | **закрыто** (шаг 2, Pages `e896196f`, `aa84510`) — рисунок из пакета |

Номера — наши, сквозные; строка 6 (Users) в таблице дизайнера отсутствует,
поэтому строк 48 при 47 у неё.

---

## Админка — остальные иконки (опись)

Собрана 29.09 обходом всех `.vue`, `.ts` и `styles/*.scss` в
`packages/admin/src`, кроме меню. Шрифтов иконок, картинок-иконок и SVG в
`background-image` в админке нет. **Нарисованных экранов самой админки
(список брендов, пользователи, неймінги, концепты, компоненты) сессия не
нашла** — на `5382:44766` и канвасе `5411:38263` админка видна только меню
вокруг визарда. Спрошено владельца 29.09, ответ дословно: «Экранов адмикни в фигме пока нет.
Админка делалась нейронкой и будет потом улучшаться.»

**Отсюда правило шага 3:** делаются только места «однозначно» — строка таблицы
совпадает с местом по назначению. Места «спросить» **не трогаются** до
переделки админки: без макета иконку им пришлось бы придумывать.

«Строка таблицы» — вариант использования из `5658:39246`, который подходит по
смыслу. «Однозначно» — место и строка совпадают по назначению; «спросить» —
совпадение по рисунку, но не по назначению, или строки нет вовсе.

| Место | Экран | Сейчас | Строка таблицы | Разбор |
|---|---|---|---|---|
| Крестик закрытия любого окна (`BaseModal.vue`) | все окна админки, 9 экранов | `&times;` шрифтом | Close → `X` Regular | **закрыто** (шаг 3, `aa84510`): 1em кнопки — 20, на телефоне 24 |
| Крестик окошка «Role permissions» (`UsersView.vue`) | Users, окно пользователя | `✕` шрифтом | Close → `X` Regular | **закрыто** (шаг 3, `aa84510`): 14 |
| Шеврон раскрытия карточки истории, 4 места (`BrandWorkflowHistoryModal.vue`) | Brands → окно истории | свой `<svg>` обводкой 2, 20 и 16 | Chevron down → `CaretDown` Regular | **закрыто** (шаг 3, `aa84510`): 20 и 16, как были |
| Пустая картинка варианта (`ComponentVariantsView.vue`) | UI Components → варианты | `<svg>` Heroicons «photo», обводка 1,5, 32 | Placeholder → `ImageSquare` Regular | **закрыто** (шаг 3, `aa84510`): 32, цвет и прозрачность как были |
| «← Back to Components», «← Back to Concepts» | варианты компонента, карточка концепта | `&larr;` в тексте кнопки | Arrow left → `ArrowLeft` Regular | **закрыто** (шаг 3, `aa84510`): иконка 16 перед текстом, зазор кнопки 8 |
| Плитка типа компонента `▦` (`ComponentsView.vue`) | UI Components | `&#9638;` шрифтом 40 | UI Components → `SquaresFour` Regular (строка меню) | **закрыто** (шаг 3, `aa84510`): 40, цвет как был |
| Крестик закрытия выезжающего меню (`AppSidebar.vue`) — **в опись не попал**: обход исключал файл меню | все экраны уже 1280 | `✕` шрифтом 18 | Close → `X` Regular | **закрыто** (шаг 3, `aa84510`): 1em = 18 |
| Стрелки сортировки ↑/↓ в заголовках таблиц, 21 место | Brands 7, Users 4, Namings 10 | `↑`/`↓` шрифтом 12 | Caret up / Caret down → `CaretUp`/`CaretDown` **Fill**? | **спросить**: в визарде этим двум строкам места нет вовсе, таблица не говорит, где они |
| Корзина «Delete» (`BrandsView.vue`) | Brands, колонка Actions | `<svg>` Lucide, обводка 2, 16 | нет строки | **спросить**: в наборе `3261:907` корзины нет |
| «i» в круге у поля Role (`UsersView.vue`) | Users, окно пользователя | `<svg>` Heroicons mini, заливка, 14 | нет строки (Exclamation circle — другое значение) | **спросить** |
| «Перепроверить домен» (`NamingsView.vue`) | Namings, вкладка External | `<svg>` Heroicons «arrow-path», 16 | Змінити вибір → `ArrowsClockwise`? | **спросить**: рисунок тот же, назначение другое |
| ✓ / ↩ в кружке 22 у пунктов истории (`BrandWorkflowHistoryModal.vue`) | Brands → окно истории | `✓`/`↩` шрифтом | Check → `Check`? для ↩ строки нет | **спросить** |
| ✓ Available / ✗ Sold / ? Unknown в бейдже | Namings, External | символ в тексте бейджа | Check / Close? | **спросить**: символ — часть надписи |
| → между «было» и «стало», 4 места | Brands → окно истории | `→` в тексте | Arrow right → `ArrowRight`? | **спросить**: стрелка — часть строки текста |
| ☀️ Light / 🌙 Dark, 6 мест | Concepts (окно), карточка концепта | эмодзи | Тема → `Palette`? | **спросить**: в визарде солнце и луна заменены одной палитрой на строке ревью, но здесь это два переключателя, которые различаются только значком |
| Логотип ◈ над «Brand Constructor» | вход в админку | `◈` шрифтом 40 | нет строки | **спросить**: это знак, а не иконка |
| «+» в шести кнопках «+ Add User», «+ New Concept», … | Users, Concepts, варианты, PR Packages, UI Components, Namings | `+` в тексте кнопки | Plus → `Plus`? | **спросить**: сейчас это текст надписи |

Не иконки, в работу не берутся: разделитель `·`, прочерк `—` в пустых
ячейках, `№` в подписи поля, буквы O/A/M в бейдже источника, бургер из трёх
полосок, два крутящихся кольца загрузки, точки и линии ленты истории, родные
стрелки `<select>`.

---

## План: шаги

| Шаг | Что делаем | Файлы | Что увидит владелец | Состояние |
|---|---|---|---|---|
| Ш1 | Меню админки по `5382:30672`: пять иконок из таблицы + Users; иконка 20, подпись в 8 от неё; пакет подключён | `admin/…/AppSidebar.vue`, `admin/…/PhosphorIcon.vue`, `shared/…/phosphorGlyph.ts`, `package.json` обоих пакетов | Новые иконки в левом меню | **закрыто** — прод `976603cb`, коммит `016e752` |
| Ш2 | Визард: 36 обёрток берут рисунок из пакета, а не из вклеенного пути | `constructor/src/components/icons/*.vue`, `kitIconSet.test.ts` | Внешне ничего — рисунок тот же. Поэтому склеен с шагом 3 (AGENTS §8.3) | **закрыто** — прод `e896196f`, коммит `aa84510` |
| Ш3 | Админка: только места «однозначно» из описи (крестик окон, шеврон истории, пустая картинка варианта, «← Back», плитка UI Components) | по описи | Новые иконки в окнах, истории, вариантах компонентов, кнопках «Back», плитках UI Components | **закрыто** — прод `e896196f`, коммит `aa84510`; места «спросить» не тронуты |

---

## Progress log

### Шаги 2 и 3 — визард на пакет, однозначные места админки · 29.09 · ЗАКРЫТО

**Приёмка.** Владелец 29.09 после выкладки `e896196f`, дословно: «комить».
Код — коммит `aa84510`.

**Задача закрыта.** Открытым остаётся одно — места «спросить» описи админки.
Это не долг задачи: по слову владельца они ждут макетов админки.

**Источник дословно.** Jira: «Потрібно підключити Phosphor Icons … як
стандартний набір іконок … Та замінити поточні іконки новими (в Admin та
Wizard) відповідно до підготовленого мапінгу у Figma». Строки таблицы
`5658:39246`, по которым сделан шаг 3: «Close → X, Regular», «Chevron down →
CaretDown, Regular», «Placeholder → ImageSquare, Regular», «Arrow left →
ArrowLeft, Regular», «UI Components → SquaresFour, Regular». Ответ владельца о
макетах админки: «Экранов адмикни в фигме пока нет. Админка делалась нейронкой
и будет потом улучшаться.»

**Шаг 2 — визард.** 36 обёрток в `constructor/src/components/icons/` импортируют
один файл пакета (`regular/…` или `fill/…-fill.svg`) и рисуют его через
`phosphorPaths()`; классы по умолчанию, доступность и все вызовы не тронуты.
**Совпадение рисунка проверено до замены**: каждая вклеенная иконка и файл
пакета отрисованы в 96×96 и сравнены попиксельно — разница от 0,00 до 0,41 %
(сглаживание краёв), пикселей с расхождением больше половины — 0 во всех 36.
Контроль, что сравнение ловит подмену: вклеенный `TextAa` против пакетного
`Palette` — 88,12 % и 2455 пикселей.

**Шаг 3 — админка.** Сделаны только однозначные места описи: крестик всех окон,
крестик окошка ролей, четыре шеврона окна истории, пустая картинка варианта,
две кнопки «Back», плитка UI Components — и **крестик выезжающего меню, который
в опись не попал** (обход исключал `AppSidebar.vue`, а шаг 1 менял там только
пункты меню). Найден сверкой выложенного js: символ `✕` остался в нём один.
Размер и цвет везде оставлены прежними — макета нет; где был символ шрифтом,
иконка занимает его кегль (`1em`) или близкий размер, записанный в таблице
описи.

**Чем проверено.**
- `kitIconSet.test.ts` уточнён, не ослаблен: вместо начала и длины вклеенного
  пути пинит (1) импорт — ровно один файл пакета, имя `glyph`, ожидаемый путь;
  (2) вес — папка файла и суффикс `-fill`; (3) рисунок в самом пакете — начало и
  длина первого пути, замерены из пакета, так что обновление пакета, меняющее
  рисунок, будет замечено; (4) разметку — `:viewBox="PHOSPHOR_VIEW_BOX"`,
  `v-for` по путям, ни одного `d="`; (5) отсутствие обводки. `CaretDownIcon`
  больше не особый случай на боксе 16 — он в общей таблице.
  **Показан красным четыре раза**: импорты `ArrowLeftIcon`/`PlusIcon` поменяны
  местами → 2 падения; `InfoCircleFilledIcon` на `regular/warning-circle.svg` → 1;
  в `CheckIcon` вернули файл из HEAD с вклеенным путём → 2; `stroke` в
  `StarIcon` → 1. После каждой подмены все 45 файлов сверены с копией — равны.
- `kitIconPlacement.test.ts` не менялся и зелёный.
- Новый `admin/tests/unit/components/adminKitIcons.test.ts` (21 тест): для
  каждого места — импорт из своего файла пакета, число вызовов, отсутствие
  прежнего символа или рисунка. **Красный трижды**: `&times;` в окне → 2;
  шеврон на `fill/caret-down-fill.svg` → 1; `▦` в плитке → 2.
- `appSidebarIcons.test.ts` дополнен крестиком меню; красный, если вернуть `✕`.
- По **выложенному** js визарда: первые пути всех 36 файлов пакета есть, ни
  одного прежнего вклеенного пути нет (скрипт сверки по HEAD-версиям файлов).
- **Стилевой файл визарда совпал байт в байт** с тем, что был до шага
  (`wizard/assets/index-CVop-QGz.css`): новые комментарии правил не породили.
- Вес визарда, все `.js` и `.css`, gzip -9: **1 065 583 → 1 045 256 (−20 327)**;
  главный файл 54 943 → 54 979. Админка с шагами 1–3: 100 214 → 102 660.
- По **выложенному** js админки: `m6 9 6 6 6-6`, `&larr;`, `←`, `9638`, `▦`,
  `&times;`, `✕` — 0 вхождений. Правила размеров иконок в выложенном css —
  все семь на месте.
- `pnpm type-check` и `pnpm test` зелёные: admin 58, constructor 1178, worker 77.
- Выкладка — **Pages Production `e896196f`**; прод отдаёт `assets/index-ULS-oD4Q.js`
  и `wizard/assets/index-BQO8ydbg.js`, те же, что собраны локально.

### Шаг 1 — меню админки · 29.09 · ЗАКРЫТО

**Приёмка.** Владелец 29.09 после выкладки, дословно: «Комить и пиши промпт для
новой сессии или продолжай здесь». Код — коммит `016e752`, прод — Pages
Production `976603cb`. Вопрос о макетах админки закрыт тем же днём (раздел
«Админка — остальные иконки»).

**Источник дословно** (таблица `5658:39246`, раздел «ADMIN SIDEBAR»):
«Brands ♦ → Tag Regular · Concepts ◈ → Lightbulb Regular · Namings ✎ → TextAa
Regular · PR Packages ★ → Megaphone Regular · UI Components ▦ → SquaresFour
Regular».
Компонент `Sidebar` `5382:30672`: пункт 210×44, поля 24/12, иконка **20×20**,
подпись в **8** от неё (x = 52); иконка в SVG-экспорте залита `white`, у
неактивных `fill-opacity 0.6` — то есть её цвет равен цвету подписи.

**Users.** Строки в таблице нет, на макетах меню нарисовано только в виде
владельца продукта (проверены `5382:30672` и весь канвас `5411:38263`: слово
«Users» не встречается). Спрошено владельца 29.09, ответ: «Два человечка
(Рекомендую)» → Phosphor `Users` Regular.

**Что сделано.** Пакет `@phosphor-icons/core` в `admin` и `constructor`.
`AppSidebar.vue`: вместо HTML-символов — файлы `regular/*.svg` пакета через
новый `PhosphorIcon.vue`; иконка 20×20 в `currentColor` (было: символ шрифтом
18 в коробке 24); зазор иконка–подпись `$spacing-2` = 8 (было `$spacing-3` =
12). **Зазор назван владельцу отдельно**: он меняет, где стоит подпись, — было
60 от края, по макету 52.

**Не тронуто, хотя видно при сверке** (не иконки — вне задачи, решение
владельца): цвет подписи неактивного пункта у нас `#94a3b8`, на макете белый
60 %; фон меню `#1e293b` против `#1b293e`; активный `#4f46e5` против
`#5147ef`; подпись у нас жирности 500, на макете 400. Иконка берёт цвет
подписи, поэтому поменяется вместе с ней, если подпись поправят.

**Чем проверено.**
- `tests/unit/components/appSidebarIcons.test.ts` (admin, 13 тестов): пинит
  ПРИВЯЗКУ — для каждой подписи меню идентификатор в её `icon:` импортирован
  ровно из своего файла пакета, папка `regular/`; файл существует и это глиф
  Phosphor; в файле нет `&#…;` и `v-html`; иконка 20×20, зазор `$spacing-2`.
- **Показан красным трижды**: Brands ↔ Concepts поменяны местами → 1 падение;
  `regular/tag.svg` → `fill/tag.svg` → 3 падения; `&#9830;` вернули в строку
  Brands → 3 падения. После каждой подмены файл восстановлен, `diff` пустой.
- По **выложенному** js: все шесть путей пакета (`M243.31,136,144,36.6` Tag,
  `M176,232a8,8,0,0,1-8` Lightbulb, `M87.24,52.59` TextAa, `M248,120a48.05`
  Megaphone, `M104,40H56A16` SquaresFour, `M117.25,157.92` Users) — в
  `assets/index-CXhRAaql.js`; `9830|9672|9998|9733|9638|9823` — 0 вхождений.
- По **выложенному** css: `.sidebar__link-icon{flex-shrink:0;width:20px;height:20px}`,
  `.sidebar__link{…gap:.5rem…}`.
- `pnpm type-check` и `pnpm test` зелёные: admin 36, constructor 1103, worker 77.
- Выкладка — **Pages Production `976603cb`**; главная прода отдаёт
  `assets/index-CXhRAaql.js`, тот же, что собран локально.
