# Стенд для ручных прогонов брифа

Код прода в браузере + локальный worker на копии базы прода. Slack и Jira выключены.
Так 30.09–01.10 найдены дыры из [`docs/design-audit/brief-holes.md`](../../docs/design-audit/brief-holes.md).

## Как устроено

- Браузер (Playwright) открывает настоящий прод `https://brand-constructor.pages.dev`,
  а все запросы `/api/*` перехватывает и отправляет на локальный worker
  `127.0.0.1:8799` (`lib.js`, `session()`).
- Вход под любой ролью — свой JWT, подписанный секретом из `.stand/stand.env`
  (`lib.js`, `USERS`: `po`, `po2`, `strategy`, `ceo`; id — из копии базы прода).
- Worker запускается с `--env-file`, поэтому **не читает** `packages/worker/.dev.vars`,
  где лежат настоящие токены Slack-бота и Jira. `start-worker.sh` останавливается, если
  wrangler всё-таки сообщил «Using secrets defined in .dev.vars».

## Запуск

```bash
cd scripts/stand
npm install                     # только здесь: свой package.json, не pnpm-воркспейс
npx playwright install chromium-headless-shell
./load-db.sh <дамп прода>.sql   # например docs/local/.../prod-backup.sql (вне git)
./start-worker.sh               # worker на 127.0.0.1:8799, лог в .stand/wrangler.log
node scenarios/s2.js            # любой сценарий
```

Сайт из локальной сборки вместо прода — проверить правку до выкладки:
`pnpm build:unified` в корне, затем `STAND_FRONT=../../deploy/unified/public node scenarios/…`.

Свежий дамп прода (только чтение):
`npx wrangler d1 export brand-constructor-db --env production --remote --output docs/local/<папка>/prod.sql`
(из `packages/worker`; файл не коммитить — `docs/local/` в `.gitignore`).

`.stand/` (копия базы, снимки экрана, служебные id) не коммитится.

## Сценарии (`scenarios/`)

| Файл | Что проверяет | Дыра |
|---|---|---|
| `s1.js` … `s1g.js` | CEO «Змінити вибір» → «Повернути» → заказчик «Застосувати варіант CEO» → повторно → утверждение | работает; H-15 |
| `s2.js` | Final review → «Редагувати» Concept → «Далі» → «назад» браузера ×2 → отправка без названия | H-02 |
| `s3.js` | то же с F5 / крестиком / «Скасувати» (`node scenarios/s3.js reload|pick-reload|close|cancel-ext`) | работает |
| `s4.js` | Brief Revision: уход посреди смены концепта (`close|reload|back|menu`) | H-03 |
| `s5.js` | комментарий CEO во втором браузере | H-04 |
| `s6.js`, `s6b.js`, `s6c.js` | заказ концепта → «В роботі» → выбор готового концепта | H-01 |
| `s8.js` | обрыв связи при сохранении | H-06 |
| `sA.js` | CEO утверждает бриф без External Naming (id брифа со стенда) | H-02 |
| `sN.js`, `sN1.js` | заказ названия: смена концепта; выбор названия у брифа «в роботі» | H-07, H-01 |
| `sF1.js` | приёмка фазы 1: заказ → «В роботі» → готовый концепт → CEO | ф1 |
| `sF2a.js`, затем `sF2a-pick.js` | приёмка фазы 2a: Strategy → Orders → «Створити концепт» → «Додати назву» → «Готово»; второй PO не видит созданное; заказчик выбирает созданное и отправляет CEO (нужна 014 в копии базы) | ф2a, H-09 |
| `sF2b.js` | приёмка фазы 2b: заказ концепта → «Чекаємо на команду» (созданное спрятано) → Strategy создаёт и отправляет → «Замовлення готове — оберіть» → «Обрати концепт» → созданное первым, без окна → название → «На погодження CEO» активна; затем H-07 на шаге 2 | ф2b, H-07 |
| `sF2b-compare.js` | сверка 2b с черновиком: «Редагувати» по разделам, меню кнопки «Бриф створено», окна подтверждения, «Редагувати» External Naming после выбора созданного | ф2b |
| `sF4.js` | приёмка фазы 4: CEO возвращает → заказ на экранах доработки (кнопки на всех трёх) → «Відправити в роботу» → Strategy создаёт и отправляет → заказчик выбирает → «На погодження CEO» как повторная (комментарии CEO очищены) | ф4 |

Часть сценариев читает id, записанные предыдущим (`.stand/run/*-id.txt`) — запускать по
порядку внутри группы. Общие шаги визарда — `flow.js` (`toFinal`, `submitted`, `returned`,
`orderConcept`, `orderNaming`, `ceoComment`, `ceoReturn`).
