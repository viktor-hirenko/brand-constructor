# Cloudflare: майбутнє перейменування (план, без виконання)

Цей документ фіксує **бажану** схему імен у Cloudflare та чекліст для **майбутнього** рефакторингу.  
**Зараз нічого з цього не застосовується:** скрипти деплою, імена проєктів у Cloudflare та код не змінювалися.

---

## Поточна vs бажана номенклатура

| Роль | Зараз | Бажано |
|------|--------|--------|
| Pages — адмінка | `brand-constructor` | `brand-constructor-admin` |
| Pages — конструктор | `brand-constructor-app` | `brand-constructor-app` *(без змін)* |
| Worker — production API | `brand-constructor-api-production` | `brand-constructor-api-prod` |
| Worker — dev API | `brand-constructor-api` | `brand-constructor-api-dev` |

---

## 1. Чому перенесено (postponed)

- Перейменування торкається **живої інфраструктури** (Workers, Pages, можливі кастомні домени, секрети, CORS).
- Поточні скрипти та документація прив’язані до існуючих імен; зміна без поетапної перевірки дає ризик простою та поламаної авторизації.
- У проді немає окремої dev-бази: dev-воркер ділить **ті самі D1/R2**, що й production — перейменування не вирішує цей ризик; його варто планувати окремо (див. кінець документа).

---

## 2. Що потрібно буде переглянути пізніше

| Область | Що перевірити |
|---------|----------------|
| **`packages/worker/wrangler.toml`** | `name`, `[vars]`, `[env.production]` (або еквівалент після зміни моделі env), прив’язки D1/R2, `triggers` |
| **Корінь `package.json`** | `deploy`, `deploy:all`, `deploy:worker`, `deploy:worker:production`, шляхи `wrangler pages deploy --project-name …` |
| **`packages/*/package.json`** | Будь-які власні `deploy` / виклики `wrangler`, якщо з’являться |
| **`.env*` / `VITE_API_URL`** | Усі фронтенд-пакети, що білдяться з `import.meta.env.VITE_API_URL` (admin + constructor) |
| **`CORS_ORIGINS`** | У `wrangler.toml` для production — списки дозволених origin після зміни URL Pages |
| **`CONSTRUCTOR_URL`** | Базовий URL конструктора для редіректів/лінків у worker |
| **Cloudflare Pages** | Назви проєктів, production/preview branches, змінні середовища білду, custom domains |
| **Cloudflare Workers** | Secrets, vars, routes, custom domains (`*.workers.dev` vs власні домени) |
| **Кастомні домени** | Якщо є — DNS і SSL після перейменування/нових проєктів |
| **`docs/PROJECT-DOCS.md`** | Приклади URL, інструкції деплою, таблиці ресурсів |

Додатково: пошук по репозиторію на рядки `brand-constructor`, `pages.dev`, `workers.dev`, `project-name`, `VITE_API_URL`.

---

## 3. Ризик

Перейменування — це не лише пошук-заміна в коді: це **зміна або створення** ресурсів у Cloudflare (нові імена Workers/Pages, маршрути, CORS, клієнтські білди з «запеченими» env). Помилка на кроці DNS або CORS може залишити прод недоступним або зламати OAuth/JWT-флоу.

---

## 4. Рекомендований порядок (коли вирішать робити)

1. Створити **backup branch** з актуального `main` (або релевантної гілки).
2. **Аудит посилань:** grep по репо + Cloudflare dashboard (Workers, Pages, secrets).
3. У Cloudflare: **перейменувати або створити** проєкти з новими іменами (за політикою команди: rename vs duplicate + cutover).
4. Оновити **локальні конфіги** (`wrangler.toml`, `package.json`, `.env*`, документація).
5. **`wrangler deploy --dry-run`** / перевірка збору без публікації, де можливо.
6. Деплой **по одному:** спочатку API prod, потім Pages (або навпаки — за залежностями CORS і `VITE_API_URL`).
7. **Перевірка:** публічні URL, логін, JWT, завантаження в R2, критичні API-роути.

---

## 5. Dev API і спільна база (обов’язкова примітка для cleanup)

Зараз dev-воркер (`ENVIRONMENT=development` у дефолтному env) використовує **ті самі `database_id` / R2 bucket**, що й production env у `wrangler.toml`. У коді auth для `development` спрощений (без production JWT).

Для майбутнього безпечного стану **один з варіантів:**

- виділити dev-воркеру **окремі D1 і R2** (окремі `database_id` / bucket у `[vars]` або окремому env), **або**
- прибрати dev-воркер з **production deploy pipeline** і не публікувати його на спільну БД.

Перейменування `brand-constructor-api` → `brand-constructor-api-dev` **само по собі** не усуває цей ризик — його треба явно спроєктувати в тій же ініціативі або окремим тікетом.

---

*Останнє оновлення документа: планове, без виконання змін у репозиторії крім додавання цього файлу.*
