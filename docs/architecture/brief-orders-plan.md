# План: бриф с заказом доходит до CEO («В роботі»)

Статус: **утверждён владельцем 01.10.2026.** Фаза 0 выполнена (файлы в дереве, не закоммичены).
Фаза 1 на проде и закоммичена 01.10 (`b3df5fa`, ветка `feature/brief-orders`). Следующая — фаза 2a. Трекер дыр — [`docs/design-audit/brief-holes.md`](../design-audit/brief-holes.md)
(источник истины по дырам; таблица ниже — снимок на 01.10).

## Коротко простыми словами (для владельца)
- **Новый статус брифа «В роботі».** Бриф с заказом больше не путается с брифом «у CEO» и
  не застревает.
- **Новой таблицы «заказы» нет.** Заказ остаётся частью брифа — один источник данных.
- **У команды Strategy в админке страница «Orders»** — список брифов с заказами, в каждом
  те же ответы заказа, что уже приходят в Slack, кнопки «Створити концепт», «Додати назву»
  (в обычных формах с полем «For brief») и «Готово». Весь бриф команде не открывается —
  ролевая модель не меняется.
- **Заказчик** получает «готово, оберіть» в канал согласований, выбирает созданное и жмёт
  «На погодження CEO».
- **Slack: все нынешние сообщения остаются** (они собраны по разделу техзадания
  «Формування документів для команд» и записке дизайнера 1958:5946). Меняются только куда
  ведут кнопки и две ошибки; два новых сообщения — «готово» и «замовлення скасовано».
- Каждая фаза — отдельная выкладка с откатом, в ветке `feature/brief-orders`.

## Как владелец проверяет и как всё убрать (обязательный порядок)
1. Вся работа — только в ветке `feature/brief-orders`; `phase/cleanup` и `main` не трогаются.
2. Фаза готова → выкладка на прод (он в режиме теста) → владелец смотрит и тестирует.
3. Есть замечания (дизайн, тексты, логика) → правки в той же ветке без коммита →
   новая выкладка → снова проверка.
4. Владелец сказал «коммит» → коммит в ветку `feature/brief-orders`.
5. Всё принято → по слову владельца слияние ветки в `phase/cleanup`.
6. Не понравилось → откат выкладок по разделу «Выкладка, откат, ветка» (сайт, сервер,
   база — за минуты), ветка удаляется; в `phase/cleanup` ничего не попало.

## Сравнение вариантов — с источниками
Факты, на которых стоит сравнение:
1. Что получают команды — техзадание `docs/product-spec/v2-prd.md:381-385`: Strategy —
   «Базова інформація (GEO, дата, коментар), Інформація про аудиторію, Обраний концепт АБО
   Бриф нового концепту, Обраний external naming АБО Бриф нового naming, Обраний internal
   naming АБО Бриф нової внутрішньої назви, Коментарі замовника та CEO»; Design и PR — свои
   части. Сообщения Slack собраны по этому перечню (W `utils/slack.ts:754-821, 565-640`).
2. Сообщение Strategy при заказе уже содержит **все ответы формы заказа** (концепт — 12
   полей, название — 11, Internal — «Що не підійшло»: `slack.ts:485-544`).
3. Записка дизайнера 1958:5946: «…натомість командам у Slack одразу приходять
   повідомлення, щоб усі могли почати роботу».
4. Где работают команды — `docs/FLOW-AND-NOTIFICATIONS-ANALYSIS.md:93`: «Команды… не
   редактируют бриф в конструкторе. Они получают информацию и работают в своих инструментах…
   Конструктор для них — источник данных, а не рабочее место»; `:161`: Strategy добавляет
   концепт/неймінг в **Админке** (Concepts, Namings).
5. Что команды видят сейчас — `docs/product-spec/brands-table-review-columns-plan.md:80-90` и
   код `W/routes/brands.crud.ts:58-71, 131-137`: меню Brands видят все, но командам
   (strategy, pr, design, ui, head_dhc) — **только утверждённые** брифы. Поэтому кнопка
   «Відкрити бриф» в их сообщениях «в роботу» сейчас мёртвая.
6. Связь «название → концепт» в админке уже есть: поле «Link to Concept»; у концепта
   плашка «Used in New Brand #N» (`A/views/NamingsView.vue:774-780`, W `concepts.ts:66-71`).

| Критерий (вес) | A. Таблица заказов + вкладка Orders | B. Через Brands: команда открывает весь бриф | C. Только Slack + поле «For brief» | **D. Вкладка Orders без новой таблицы** |
|---|---|---|---|---|
| Не ломает сообщения и процессы (3) | 3 | 3 | 3 | 3 |
| Не меняет ролевую модель (2) | 3 | 1 — командам открываются брифы «в роботі» целиком, вопреки факту 5 | 3 | 3 — страница отдаёт только то, что уже есть в Slack (факт 1–2) |
| Работа команды: найти, сделать, отметить «готово» (3) | 3 | 2 — бриф в визарде, формы в админке, переходы туда-обратно | 1 — негде нажать «готово», нет списка | 3 |
| Работа заказчика (3) | 3 | 3 | 3 | 3 |
| Один источник данных, без рассинхрона (3) | 1 — заказ в двух местах | 3 | 3 | 3 |
| Объём и риск работы (2) | 1 | 2 | 3 | 2 |
| Видно, что ждёт и сроки (1) | 3 | 2 | 1 | 3 |
| **Итого (макс. 51)** | 41 | 40 | 43 | **49** |

Как это выглядит в сценариях:
- **Пришёл заказ концепта.** A, D: сообщение в bc-strategy → кнопка → страница заказа →
  «Створити концепт» (форма с «For brief») → картинки → «Додати назву» ×N → «Готово».
  B: та же кнопка → весь бриф в визарде → «Переглянути бриф нового концепту» → переход в
  Concepts → назад в бриф → Namings → назад → «Готово». C: создать в Concepts и выбрать бриф
  из списка, «готово» — нигде (или угадывать автоматически).
- **Через неделю перечитать заказ / посмотреть, что ждёт.** A, D: список Orders. B: вкладка
  в Brands. C: искать в Slack.
- **Заказчик передумал и выбрал готовый концепт.** Везде: ответ в ветке сообщения заказа
  «можна не робити». A: ещё и синхронизировать таблицу заказов. B, C, D: ничего хранить
  не нужно.
- **PR и Design.** Везде одинаково: получают своё по техзаданию; бриф им нужен только после
  утверждения.

**Вывод: D.** В прошлых версиях плана были A (верная страница, лишняя таблица — заказ
хранился бы дважды) и B (без таблицы, но командам открывался весь бриф и ломалась ролевая
модель). D берёт лучшее из обоих: страница Orders — это **вид на брифы «в роботі»**, а не
новая сущность; данные заказа остаются в брифе; команда видит ровно то, что ей положено по
техзаданию.

## Трекер дыр (снимок; актуальный — `docs/design-audit/brief-holes.md`)
Источники: прогон 30.09–01.10 (scratchpad `run/results.md`; витрина
https://claude.ai/artifact/Utyxg7ZLWojhr5yVmDAc3y), опись Slack/Jira 01.10, разбор рисков
01.10, таблица 290 сценариев (`docs/design-audit/edit-flow-scenarios.md`, витрина
https://claude.ai/artifact/2ajxxguAG3TxsfBLJH5txw).

| ID | Дыра | Как воспроизвести | Причина | Где закрывается |
|---|---|---|---|---|
| H-01 | Бриф «В роботі» нельзя довести до CEO (блокирует) | заказ → «Відправити в роботу» → «Редагувати» Concept → выбрать → «Далі» → ложное «відправлено CEO»; с заказом названия «Зберегти» → 409 | `draftEditGuard` по живому store (C `router/index.ts:50-68`); PUT только draft/needs_revision (W `brands.crud.ts:275-287`) | ф1 |
| H-02 | Бриф уходит CEO и утверждается без External Naming | Final review → «Редагувати» Concept → другой → «Далі» → «назад» ×2 → отправить | нет проверки полноты и пары на сервере | ф1 (сервер); клиент — open |
| H-03 | Brief Revision: недоделанная правка выглядит сохранённой | вернуть → «Редагувати» Concept → другой → «Далі» → крестик/F5/меню/«назад» | localStorage `brief_<id>_author-revision` | open |
| H-04 | Комментарии CEO до «Повернути/Затвердити» только в браузере | CEO пишет → другой браузер пусто | не уходят на сервер до смены статуса | open |
| H-05 | Slack «повернуто»: «Обрано» и «Альтернатива CEO» оба = CEO | вернуть с вариантом CEO | W `brands.status.ts:163-177`, `brands.notifications.ts:28-50` | ф3 |
| H-06 | Обрыв связи: «Далі»/«Зберегти» молчат; Final review — «Failed to fetch» | сеть off | нет общего сообщения | open |
| H-07 | Заказ названия под один концепт переезжает на другой | шаг 3 заказ → «Назад» → другой концепт | шаг 2 не сбрасывает `new_naming_brief` | ф2b |
| H-08 | Окно выхода обещает «Усі зміни збережено» при отброшенной правке | правка концепта → крестик | текст окна | open |
| H-09 | Выбор, забранный другим утверждённым брифом, молча «Не обрано»; утверждение перезаписывает чужой used | Luna в New Brand #74 | approve без условия (W `brands.status.ts:332-356`) | ф2a (запрет); отображение — open |
| H-10 | CEO не может предложить концепт, у которого все названия Sold | CEO → Farm | у CEO нет заказа | open (продукт) |
| H-11 | После «Застосувати варіант CEO» «2 секції потребують уваги» не уменьшается | применить вариант CEO | счётчик | open |
| H-12 | «Відкрити бриф» ведёт на старый сайт; у команд при «в роботу» кнопка мёртвая | любое сообщение | `CONSTRUCTOR_URL` (`wrangler.toml:39`); команды видят только approved | ф1, ф2a |
| H-13 | Стенд мог слать в настоящий Slack/Jira | `wrangler dev --env production` читает `.dev.vars` с боевыми токенами | — | ф0 |
| H-14 | Jira при «в роботу» «[Нове замовлення]… CEO review пропущено» остаётся после утверждения | заказ → утвердить | Initiative не обновляется (`jira.ts:346-350, 535-537`) | open (решение владельца) |
| H-15 | Сервер даёт CEO утвердить/вернуть бриф «в роботі» и выбрать вариант | прямой PATCH | `brands.status.ts:97-110`, `brands.ceo.ts:51-63` | ф1 |
| H-16 | Старые комментарии CEO уходят командам при утверждении из доработки | — | чистятся только при повторной отправке | open |
| H-17 | Длинный бриф не уходит в Slack (блок ≤3000 знаков, комментарии до 5000) | — | один блок (`slack.ts:272-306`) | ф1 |
| H-19 | «Нові замовлення» в approvals не упоминает Internal Naming | заказать только Internal Naming | `slack.ts:733-735` | ф1 |
| H-20 | Формы концепта/названия в админке без обработки ошибок | — | нет `catch` | ф2a |
| H-21 | Визард зовёт несуществующий `GET /api/namings/internal/:id` | — | `RevisionInternalNamingView.vue:105` | open |
| H-22 | PATCH статуса принимает `ceoComments/ceoSelections` от любой роли | прямой PATCH | `brands.status.ts:131-139` | open (спросить владельца) |
| H-23 | Двойной клик / вторая вкладка — двойные сообщения | быстрый повтор | `UPDATE … WHERE id=?` (`brands.status.ts:141-145`) | ф1 |

Не дыра (по задумке): PR и Design получают сообщение и при «в роботу», и при утверждении
(техзадание v2-prd:381-385 + записка 1958:5946).
Работает: «всё из списка»; заказ → «Відправити в роботу»; CEO «Змінити вибір» → «Повернути»
→ «Застосувати варіант CEO» → повторно → утверждение; «Потрібно обрати варіант»;
F5/крестик/«Скасувати» в черновике. Не подтвердилось: «CEO предложил только концепт —
название пропало».

## Slack и Jira: подробный разбор (минимальные изменения)
Каналы: `bc-approvals` (PO + CEO), `bc-strategy`, `bc-pr`, `bc-design`. Всё шлёт
`PATCH /api/brands/:id/status`. Содержимое командам — по техзаданию v2-prd:381-385;
рассылка при заказе — по записке 1958:5946.

| # | Когда | Канал | Что сейчас | Решение |
|---|---|---|---|---|
| A1 | «Відправити в роботу» | approvals | 🚀 «Бриф відправлено в роботу», GEO, дата, «Нові замовлення: …», *«…CEO-ревью не потрібне»*, «Відкрити бриф», Jira | **оставить**; кнопка → админка (бриф); добавить Internal Naming в «Нові замовлення» (H-19); фразу «CEO-ревью не потрібне» → «На погодження CEO — після того, як замовник обере готове з бібліотеки» (позднее решение дизайнера BRIEF-031: «CEO має бачити бриф лише після того, як усі обов'язкові дані вже готові»; сейчас текст говорит CEO неправду; если владелец против — одна строка) |
| A2 | то же | strategy | 📝 «Нове замовлення для …» — всё по перечню Strategy, все ответы заказа, Jira | **текст без изменений**; кнопка «Відкрити бриф» → страница заказа в админке `/orders/<id брифа>` (сейчас мёртвая — факт 5); длинный текст режется на блоки ≤3000 (H-17); `ts` сообщения сохраняется у брифа |
| A3 | то же | pr | 📝 «Новий бриф відправлено в роботу», PR-пакет, Jira | **текст без изменений**; кнопку «Відкрити бриф» не показывать, пока бриф «в роботі» (PR видит только утверждённые брифы — факт 5; всё нужное по техзаданию уже в тексте) |
| A4 | то же | design | то же + Deliverables, компоненты | как A3 |
| J1 | то же | Jira | Initiative «[Нове замовлення]…» | **без изменений** (H-14 — позже, решение владельца) |
| B | черновик / в роботі → «На погодження CEO» | approvals | 🆕 «Новий бриф відправлено на розгляд» | **без изменений**; кнопка → админка |
| C | доработка → «На погодження CEO» | approvals | 🔄 «Бриф повторно відправлено на розгляд» | **без изменений**; кнопка → админка |
| D | CEO «Повернути» | approvals | ⚠️ «Бриф повернуто на доопрацювання» | **текст без изменений**; «Обрано» = выбор заказчика (H-05); кнопка → админка |
| E1–E4 | CEO «Затвердити» | strategy, pr, design, approvals | ✅ «Бренд затверджено» | **без изменений**; кнопка → админка (утверждённый бриф команды открыть могут) |
| N1 новое | команда «Готово» в Orders | approvals | — | ✨ «Замовлення для New Brand #N готове: концепт Sunrise і 3 назви. Оберіть у брифі та відправте CEO» + «Відкрити бриф» (+ @заказчик при правах бота) |
| N2 новое | заказчик выбрал другое вместо заказанного / сменил концепт / бриф удалён | strategy, ответом под A2 | — | «Замовлення для New Brand #N скасовано: замовник обрав Wonka з бібліотеки. Можна не робити» |
| N4 (ф4) | доработка → «Відправити в роботу» | как A1–A4 | — | те же A1–A4 с пометкой «після повернення від CEO» |

Все Slack-вызовы — в `waitUntil` после записи в базу; ошибка Slack не ломает действие;
неудача — событие `slack_failed` в History. Кнопки к брифу →
`${ADMIN_URL}/workspace/brand/<id>`, «Посилання на бриф» в Jira — туда же; отдельный
визард не трогаем.

## Фазы — работы по файлам
Пути: W = `packages/worker/src`, C = `packages/constructor/src`, A = `packages/admin/src`,
S = `packages/shared/src`.

### Фаза 0 — сохранить найденное — ВЫПОЛНЕНО 01.10 (в дереве, не закоммичено; коммит «только документы» — первым в ветку по слову владельца)
- `docs/design-audit/brief-holes.md` — трекер выше; строка в `docs/design-audit/README.md`.
- `git add docs/design-audit/edit-flow-scenarios.md` (290 сценариев).
- `docs/architecture/brief-orders-plan.md` — этот план (§8.2), включая «Сравнение
  вариантов»; в `docs/architecture/edit-flow-scenario-audit.md` — «заменено ручным
  прогоном и планом brief-orders».
- `scripts/stand/` из scratchpad `pw/` (`lib.js`, `flow.js`, `s1*.js s2.js s3.js s4.js s5.js
  s6*.js s8.js sA.js sN*.js`), свой `package.json` (`private`, devDep `playwright`; не через
  `npm` в корне), пути через `STAND_DIR`; `README.md` стенда (дамп → `wrangler d1 execute
  --local --persist-to`; `wrangler dev --env production --local --persist-to … --port 8799
  --env-file stand.env` с пустыми `SLACK_BOT_TOKEN`, `JIRA_API_TOKEN`,
  `JIRA_INITIATIVE_ENABLED=false`; старт прерывается, если в логе «Using secrets defined in
  .dev.vars» — H-13).
- Scratchpad: `/private/tmp/claude-502/-Users-v-hirenko-Desktop-DevHubVault-Projects-brand-constructor/560b8228-a2a0-45f7-9319-203b53741526/scratchpad`
  (`run/results.md`, `pw/*.js`, `stand.env`); если папки нет — трекер берётся из этого плана.

### Фаза 1 — статус «В роботі», разблокировка заказчика, проверки сервера — В ПРОДЕ, ЗАКОММИЧЕНА 01.10 (`b3df5fa`)
Отличия от списка ниже, решены по ходу: проверки полноты и заказа — в `W/utils/brief-checks.ts`
(не в `brands.ts`); Slack с записью `slack_failed` — `W/utils/slack-dispatch.ts`; данные 013 —
генератор `W/src/db/in-work-013.ts` + `W/scripts/in-work-013.ts`
(`pnpm --filter @brand-constructor/worker migrate:013:data`); название без концепта
(`concept_id IS NULL`) не считается «чужим»; кнопка заказа в `in_work` скрыта (`BriefOrderButton`
`locked`); вторая вкладка получает «Бриф змінено — оновіть сторінку.» и на PUT.
Shared
- `S/constants/statuses.ts`: `IN_WORK: 'in_work'`; переходы зеркалят сервер (тест).
- `S/constants/workflow.ts`: события `sent_to_work`, `slack_failed`.
Worker
- `W/utils/brands.ts`: `STATUS_TRANSITIONS` draft→[in_work, submitted]; in_work→[submitted];
  submitted→[approved, needs_revision]; needs_revision→[submitted, approved];
  **`brandStatusValues` (:55-60) вписать руками**; `validateBriefCompleteness()` (концепт;
  ≥1 External Naming, все — этого концепта; Internal Naming), ошибки по-украински.
- `W/routes/brands.status.ts`: убрать `isReadyForCeoResubmit` (:64-77); смена статуса
  атомарно `UPDATE … WHERE id=? AND status=?`, `meta.changes===1`, иначе 409 «Бриф змінено —
  оновіть сторінку»; сообщения/события только у победившего запроса (H-23); `→ in_work`:
  владелец, заказы есть; draft→submitted с заказом → 400 «Сторінка застаріла — оновіть
  (F5)»; `→ submitted`: нет заказов + полнота; `approved`: нет заказов + полнота по итоговому
  выбору с вариантом CEO (`finalConceptId/finalExtIds/finalIntId`, :289-309); `in_work` для
  approve/needs_revision недопустим (H-15). Сообщения при `→ in_work` — A1–A4 и Jira как
  сейчас.
- `W/utils/slack.ts`: `buildMessage` режет текст на секции ≤3000 (≤50 блоков), длинные поля
  — «…повний текст у брифі» (H-17); A1 — Internal Naming и фраза про CEO; кнопки к брифу →
  `${ADMIN_URL}/workspace/brand/<id>`; A3/A4 при `in_work` без кнопки; `W/utils/jira.ts:379,397`
  → админка; `sendSlackMessage` → `{ ok, ts, channel }`, `ts` A2 сохраняется у брифа.
- `packages/worker/wrangler.toml`: `ADMIN_URL = "https://brand-constructor.pages.dev"`;
  `CONSTRUCTOR_URL` не трогать; `W/types.ts`.
- `W/utils/brand-workflow.ts`: `in_work` → `sent_to_work_at`, `submit_count` не растёт;
  событие `sent_to_work`.
- `W/routes/brands.crud.ts` PUT: `in_work` — владельцу; в `in_work` нельзя добавить/изменить
  JSON заказа (только снять: `null`) и сменить `mode` (400, по-украински).
- `W/routes/brands.ceo.ts`: CEO-выбор только submitted/needs_revision (тест на `in_work`).
- `W/db/migrations/013_in_work_status.sql` (+ `W/db/schema.sql`): столбцы брифа
  `sent_to_work_at`, `orders_ready_at`, `orders_ready_by`, `orders_slack_channel`,
  `orders_slack_ts`; перевод брифов по **списку id**, собранному в JS общей
  `brandHasNewBriefsFromRow` по свежему дампу (SQLite `TRIM` ≠ JS `.trim`), `UPDATE … WHERE
  id IN (…) AND status='submitted'`; для них `submit_count = max(0, submit_count-1)`,
  последнее событие `submitted` → `sent_to_work`, `sent_to_work_at = submitted_at`.
  Проверочные запросы до запуска (0 строк или показать владельцу): `json_valid(step_data)=0`;
  поля заказа `'null'`/`''`; draft/needs_revision с JSON заказа; брифы с названиями чужого
  концепта. `013_down.sql`: `in_work` с заказом → `submitted`, без заказа → `draft`. Скрипт
  `db:migrate:013:remote` в `packages/worker/package.json`.
Constructor
- `C/router/index.ts`: `draftEditGuard` — `draft | in_work` по статусу брифа (H-01);
  `ceoReselectGuard` — без `in_work`.
- `C/domain/reviewPhase/resolveBrandBriefReviewPhase.ts`, `BrandBriefReviewPhase.ts`: «в
  работе» = `in_work || (submitted && hasNewBriefs)` (совместимость на окно выкладки);
  неизвестный статус для CEO — не черновик.
- `C/views/wizard/BriefReviewView.vue`: убрать ветку «Зберегти» (:357-369); «Відправити в
  роботу» шлёт `'in_work'` (типы :357, :416, сброс черновиков, success); PDF для `in_work`.
- `C/components/constructor/review/ReviewUnifiedView.vue`: в `po-in-work` правка только
  Concept / External / Internal Naming (:284-289); футер «На погодження CEO» (серая +
  «Оберіть замовлене з бібліотеки», пока есть заказ или бриф неполный) и PDF (:691-716);
  бейдж (:423-428).
- Заказ в `in_work` — только просмотр: `openBriefPreview(kind, { allowEdit: status !==
  'in_work' })` (`C/stores/constructor/usePreviews.ts:84-90`; вызовы DraftConceptEditView:300,
  DraftExternalNamingEditView:203, ExternalNamingView:123, InternalNamingView:105).
- «В роботі»: `brandBriefStatusBadge.ts`, `ReviewHeader.vue`, `statusPillBadge.ts`;
  `useBrandData.ts:114-120` `successType`; `BrandSuccessView.vue` (общий `brandHasNewBriefs`);
  `usePrintBrand.ts:34-39`; `useBriefExitConfirm.ts`.
- `C/main.ts`, `A/main.ts`: `vite:preloadError` → `location.reload()`.
Admin
- `A/views/BrandsView.vue`: вкладка «In Work» (для тех, кто видит такие брифы: admin, CEO —
  нет, PO — свои), бейдж (CSS :687-716), фильтр CEO по `in_work || (submitted && hasNewBriefs)`.
- `A/composables/useBrandReviewDisplay.ts`: кейс `in_work`, `getWaitingSince` по
  `sentToWorkAt`; `A/composables/useWorkflowTimeline.ts`: `sent_to_work`, `slack_failed`.
- `AGENTS.md` §4 (:120-122): «Статусов бренда пять…».

### Фаза 2a — страница Orders, «For brief», резерв, «Готово»
Worker
- `014_for_brand.sql` (до Worker): `for_brand_id` в `concepts`, `external_namings`,
  `internal_namings` + индексы.
- `W/routes/orders.ts` (роли strategy_identity, admin, head_dhc; без расширения доступа к
  брифам): `GET /api/orders?tab=open|ready|archive` — вычисляется из брифов (`in_work`, без/с
  `orders_ready_at`; архив — покинувшие `in_work` за 30 дней); `GET /api/orders/:brandId` —
  имя брифа, автор, GEO, дата, режим, комментарии заказчика, ответы заказа (то, что уже в
  A2), созданное (`for_brand_id`), состояние; `POST /api/orders/:brandId/ready` — условно
  (`WHERE id=? AND status='in_work' AND orders_ready_at IS NULL`), если для каждого вида
  заказа есть созданное (концепт — ≥1 концепт + ≥1 его название; названия — ≥1; Internal —
  ≥1); событие `orders_ready`. Метки вопросов — общий `S/constants/orderQuestionLabels.ts`
  (из `slack.ts:485-544` / `jira.ts:183-231`).
- W `routes/concepts.ts`, `routes/namings.ts`: POST/PUT с `for_brand_id` (бриф `in_work`, есть
  заказ нужного вида; название к заказу концепта — к концепту с тем же `for_brand_id`);
  после «Готово» удалять/менять привязку нельзя; GET отдают `for_brand_id`,
  `for_brand_name` (JOIN как «Used in …»).
- Резерв **на сервере**: `isSelectableForBrand()` в PUT брифа, PATCH ceo-selections и
  approve — созданное для другого брифа выбирать нельзя; списки без `include_reserved=1`
  его прячут (админка передаёт); approve `AND (used_in_brand_id IS NULL OR used_in_brand_id
  = ?)`, иначе 409 (H-09). Резерв снимается: заказ снят, бриф удалён (W
  `brands.crud.ts:321-351`, в ту же пачку), после утверждения — у невыбранного.
- PUT владельца в `in_work`: заказ снят и выбрано не созданное для брифа → событие
  `order_cancelled`, снять резерв с невыбранного.
Admin
- `A/router/index.ts` (`/orders`, `/orders/:brandId`, `meta.roles`), `A/components/ui/AppSidebar.vue`
  (Orders между Brands и Concepts, счётчик открытых,
  `@phosphor-icons/core/regular/clipboard-text.svg?raw`), `AppHeader.vue`.
- `A/views/OrdersView.vue` (Open / Ready / Archive: бриф, что заказано, автор, дата, срок,
  что создано); `A/views/OrderDetailView.vue` (ответы заказа, созданное, «Створити концепт»,
  «Додати назву», «Готово — повідомити замовника») — данные только из `/api/orders/:brandId`.
- `A/components/library/ConceptCreateModal.vue`, `NamingCreateModal.vue` — вынести из
  `ConceptsView.vue` (262-318) и `NamingsView.vue` (722-789); поле «For brief» (на странице
  заказа закреплено, на страницах библиотеки — необязательный выбор); обработка ошибок
  (H-20); плашка «For New Brand #N».
- Тесты: `appSidebarIcons.test.ts` (сейчас ровно 6 строк), `roleTabs.test.ts`.

### Фаза 2b — экраны заказчика «готово»
- `ReviewUnifiedView.vue` (:216-260): «Чекаємо на команду» / «Замовлення готове — оберіть»;
  `ReviewConceptBlock.vue`, `ReviewExternalNamingsList.vue`, `ReviewInternalNamingBlock.vue`:
  «Створено для вашого брифу» и кнопки «Обрати концепт / назви / назву».
- `DraftConceptEditView.vue`, `DraftExternalNamingEditView.vue`, `InternalNamingView.vue`:
  созданное для брифа — первым с подписью; без окна «Обрати цей концепт?» для него.
- `ConceptSelectionView.vue` (шаг 2): смена концепта снимает заказ названия (H-07).
- `C/stores/libraries.ts`: `available_for_brand` везде, где есть бриф.

### Фаза 3 — новые сообщения и исправление «Обрано»
- N1 «готово» в approvals по `POST /api/orders/:brandId/ready`; N2 «скасовано» ответом под
  A2 (`thread_ts` из `orders_slack_ts`; пустой `ts` → обычное сообщение, без ошибки).
- Упоминание через `users.lookupByEmail`; без прав или при ошибке — имя текстом.
- H-05: «Обрано» из выбора заказчика, «Альтернатива CEO» — из выбора CEO.

### Фаза 4 — заказ при доработке (не из макетов)
- `RevisionConceptView.vue` (goDali :243-277 не обнулять заказ), `RevisionExternalNamingView.vue`
  (:136-138, :160-163), `RevisionInternalNamingView.vue`: кнопка и формы заказа как в draft-edit.
- Переход `needs_revision → in_work`, футер «Відправити в роботу»; A1–A4 с пометкой «після
  повернення від CEO».
- «Повторная отправка» — по `needs_revision_at != null`, не по текущему статусу (очистка
  комментариев CEO :123-129, «повторно» :220-223, `isResubmit`, `RESUBMIT_CLEARED_CEO`
  `brand-workflow.ts:425,531`).

## Тесты (каждый показать красным при снятой защите — AGENTS §2.3)
- Инфраструктура (ф1): обёртка D1 над `node:sqlite` (Node 22) с настоящими миграциями; без
  `node:sqlite` — пропуск. Старый fake D1 (`pr-package-shared.test.ts:19-49`) не умеет
  batch/changes/JSON.
- Ф1 worker: PATCH принимает `in_work`; переходы shared = worker; два одновременных
  draft→in_work → 200 и 409, сообщения ровно один раз; PUT в `in_work`: добавить/изменить
  заказ или `mode` → 400, снять → 200; draft→submitted с заказом → 400; in_work→submitted с
  названиями чужого концепта → 400; approve только концептом CEO → 400, из доработки с
  заказом → 400; CEO-выбор для `in_work` → 400; отказ Slack → PATCH 200 + `slack_failed`;
  блоки ≤3000 при комментарии 5000; тексты A1–A4 и B–E без изменений, кроме оговорённых
  (снимок текста); кнопки ведут на `ADMIN_URL`, A3/A4 при `in_work` без кнопки; 013 =
  `brandHasNewBriefsFromRow` на примерах («\n», битый/NULL `step_data`, `'null'`);
  `013_down` делит на submitted/draft; snapshot не растит `submit_count`.
- Ф1 клиент: резолвер (CEO+in_work → заглушка; неизвестный статус для CEO ≠ черновик;
  submitted+заказ = в работе); `po-in-work` без лишних «Редагувати», заказ только просмотр;
  `successType('in_work')`; админка: CEO не видит `in_work`, `getWaitingSince('in_work')`;
  обновить `resolveBrandBriefReviewPhase.test.ts:59-78`, `useBrandReviewDisplay.test.ts:82-92`,
  `uiBadge.test.ts`, `exitConfirmations.test.ts`.
- Ф2a: `/api/orders` недоступен PO/CEO/PR/Design; команда не получает через него поля брифа
  сверх перечня; «Готово» не срабатывает без созданного и дважды; гонка «Готово» против
  выбора из библиотеки; чужой резерв не выбирается (PUT 400), скрыт в визарде, виден в
  админке; approve занятого другим брифом → 409; удаление брифа снимает резерв в той же пачке.
- Ф3: N1 один раз на бриф; N2 ответом в ветке; «Обрано» ≠ «Альтернатива».
- Ф4: needs_revision→in_work→submitted чистит комментарии CEO и шлёт «повторно».

## Выкладка, откат, ветка
- **До ветки:** в `phase/cleanup` не закоммичена правка прокрутки окон (уже на проде):
  `A/utils/wizardDim.ts`, `A/views/WizardWorkspaceView.vue`,
  `admin/tests/unit/utils/wizardDim.test.ts`. Если на старте она ещё не закоммичена —
  остановиться и спросить владельца («коммит» → коммит в `phase/cleanup`). Документы фазы 0
  (`docs/design-audit/brief-holes.md`, `edit-flow-scenarios.md`, README, этот план,
  `edit-flow-scenario-audit.md`, `scripts/stand/`) — первым коммитом уже в ветку.
- Ветка `feature/brief-orders` от `phase/cleanup`; один проверяемый шаг = один коммит
  (исключение — коммит фазы 0 «только документы»); вливать — по слову владельца.
- Перед первой миграцией: `npx wrangler d1 export brand-constructor-db --env production
  --remote --output docs/local/brief-orders/prod-before-013.sql` и закладка
  `wrangler d1 time-travel info brand-constructor-db --env production` (в трекер).
- Ф1 вперёд: Worker (`pnpm deploy:worker:production`) → Pages (`pnpm build:unified && cd
  deploy/unified && npx wrangler pages deploy public --project-name brand-constructor --branch
  main`, проверить Production) → сразу 013 → отдельный визард `pnpm deploy:constructor`.
  Назад: `013_down.sql` → Pages из `phase/cleanup` → `wrangler rollback --env production`.
- Ф2a вперёд: 014 → Worker → Pages. Назад: Pages → Worker (поле старому коду не мешает).
- Ф2b, Ф3, Ф4 — только код; назад — прошлая выкладка.
- Крайний случай базы — `wrangler d1 time-travel restore` на закладку.
- Утверждение плана = согласие (AGENTS §1) на: статус `in_work` и правку §4 AGENTS.md;
  миграции 013/014 на remote D1; `ADMIN_URL` в `wrangler.toml`; выкладки сайта, сервера и
  отдельного визарда. Коммиты — только по слову «коммит».

## Проверка на проде (роль указана)
- Ф1 — **Product Owner**: заказ → «Відправити в роботу» → «В роботі»; «Редагувати» Concept →
  готовый концепт → «Далі» → External Naming → «Зберегти» → «На погодження CEO» активна →
  отправить. **CPO/CEO**: «В роботі» нет в списке, по ссылке «Бриф ще в роботі»; после
  отправки обычный Brief Review → утвердить. Slack: при «в роботу» те же 4 сообщения;
  кнопки к брифу открывают админку, у PR/Design при «в роботі» кнопки нет; в approvals новая
  фраза про CEO. Негатив: «назад» в правке → отправка без названия отклонена понятным текстом.
- Ф2a — **Admin** (у владельца нет роли strategy; стенд — под strategy_identity): Orders →
  бриф → ответы заказа → «Створити концепт» → картинки → «Додати назву» → «Готово». **PO**:
  выбрать созданное → CEO. **Второй PO**: созданное не видно. Кнопка в сообщении bc-strategy
  открывает страницу заказа.
- Ф2b — **PO**: «Чекаємо на команду» → после «Готово» «Замовлення готове» → «Обрати
  концепт» → созданное первым, без окна подтверждения.
- Ф3 — каналы: одно «готово» в bc-approvals; «скасовано» ответом под заказом в bc-strategy.
- Ф4 — **CEO** вернуть с комментарием «нужен новый концепт» → **PO** при доработке
  «Замовити новий концепт» → «Відправити в роботу» → дальше как Ф2 → снова CEO.
- Стенд (`scripts/stand/`, Slack/Jira выключены) — те же сценарии до выкладки, плюс двойной
  клик и вторая вкладка.

## Риски и чего не обещаем
- Тестовые сообщения уходят в настоящие каналы (владелец согласен).
- Окно между Pages и 013 покрыто совместимостью клиента; 013 — сразу.
- Open-дыры трекера (H-03, H-04, H-06, H-08, H-10, H-11, H-14, H-16, H-21, H-22) не закрываются.
- Много сессий Claude в этом проекте: перед фазой `git status --short` без чужих правок (§8.3).

## Сессии и модель (каждая — новый чат)
| Сессия | Что | Модель |
|---|---|---|
| 1 | Фаза 1 (+ коммит документов фазы 0 в ветку) | Opus, high |
| 2 | Фаза 2a | Opus, high |
| 3 | Фаза 2b | Opus, high |
| 4 | Фаза 3 | Opus, high |
| 5 | Фаза 4 | Opus, high |

Промпт сессии 1 (копировать без правок):
```text
Проект: /Users/v.hirenko/Desktop/DevHubVault/Projects/brand-constructor
Если этой папки нет — остановись и скажи мне, ничего не делай и не ищи
похожие проекты в других папках.
Прочитай AGENTS.md и docs/STATE.md, дальше действуй по §8.
Задача: фаза 1 плана docs/architecture/brief-orders-plan.md
(«Бриф с заказом доходит до CEO»). Фаза 0 уже сделана: документы и
scripts/stand/ лежат в дереве, не закоммичены — сверь их с планом.
Если правка прокрутки окон (admin wizardDim) ещё не закоммичена —
остановись и спроси меня.
Ветка: feature/brief-orders от phase/cleanup — создай сам; документы
фазы 0 — первым коммитом в неё, когда я скажу «коммит».
Режим: реализация. Выкладка на прод — в порядке из плана, с резервной
копией базы. Коммит — только после моего слова «коммит».
.swarm/, agentdb.rvf, ruvector.db не брать.
Сделай только фазу 1 и остановись.
Модель: Opus, high. Новый чат.
```

## Progress log

| Дата | Фаза | Что | Коммит |
|---|---|---|---|
| 01.10.2026 | 0 | Документы, трекер дыр, стенд | `beba2a5` |
| 01.10.2026 | 1 | Статус `in_work`, разблокировка заказчика, проверки сервера, Slack/Jira в админку, миграция 013. Тесты: worker 157, constructor 1246, admin 161; 18 защит показаны красными; стенд `sF1.js` и H-02 на локальной сборке. Выкладка не сделана: защита среды не пускает к проду без прямого разрешения владельца | `b3df5fa` |
| 01.10.2026 | 1 | Выкладка по разрешению владельца: копия базы, Worker `8097f336`, Pages `b05f824f`, 013 + данные (New Brand #53, #54 → `in_work`), отдельный визард `03b06213`. Ждёт QA | `b3df5fa` |
| 01.10.2026 | 1 | Замечания владельца после первой проверки: экран «відправлено в роботу» фиолетовый, как бейдж; «Редагувати» у External Naming скрыто, пока заказан новый концепт (без концепта шаг показывал названия всех концептов). Pages `23514d40` | `b3df5fa` |
