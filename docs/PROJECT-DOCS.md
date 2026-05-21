# Brand Constructor — Project Documentation

> Технічна документація monorepo Brand Constructor: архітектура, безпека, API,
> деплой і операційні нотатки. Орієнтована на нових розробників, тімліда та
> security review.
>
> Source-of-truth щодо продукту (PRD, бізнес-вимоги) лежить у
> [`docs/product-spec/`](./product-spec/README.md). Цей документ описує
> **фактичну реалізацію**, а не задумане.

---

## 1. Що це за проєкт

Brand Constructor — внутрішній інструмент для створення брендів. Реалізований
як monorepo з двома SPA-додатками і одним API:

| Додаток | URL (prod) | Призначення |
|---|---|---|
| **BC Admin** | https://brand-constructor.pages.dev | CRUD-керування бібліотеками контенту (concepts, namings, PR packages, UI components, users). Користуються Strategy & Identity, UI Designers, PR & Marketing, Admin |
| **Brand Constructor app** | https://brand-constructor-app.pages.dev | Wizard для Product Owner — крок-за-кроком створення бренду на основі заповнених бібліотек, з flow CEO approve / send-back |
| **Brand Constructor API** | https://brand-constructor-api-production.upstars-landings.workers.dev | Cloudflare Worker (Hono.js). REST + cron domain-check + Slack-нотифікації |

Обидві фази продукту (admin libraries + PO wizard) **реалізовані**. Подальший
roadmap — у [`FUTURE-WORK.md`](./FUTURE-WORK.md) (зверніть увагу — документ є
історичним snapshot'ом, частина пунктів вже виконана).

---

## 2. Архітектура

```
brand-constructor/
├── packages/
│   ├── admin/             # Vue 3 SPA — BC Admin (бібліотеки)
│   ├── constructor/       # Vue 3 SPA — Wizard для Product Owner
│   ├── worker/            # Cloudflare Worker — REST API + cron + Slack
│   └── shared/            # TypeScript-типи та константи (роли, дозволи, asset rules)
├── docs/                  # Документація (див. розділ 20)
├── scripts/               # Операційні скрипти (наприклад, slack:cleanup)
├── turbo.json             # Turborepo pipeline
├── pnpm-workspace.yaml    # pnpm workspaces
└── package.json           # Корневі скрипти (dev / build / deploy / ...)
```

### Чому monorepo

Frontend і backend поділяють TypeScript-типи (`Concept`, `Brand`, `User`,
`PrPackage`, …) та константи (ролі, дозволи, asset constraints). Зберігання їх
у пакеті `@brand-constructor/shared` усуває розбіжності — зміна поля одразу
проявляється у трьох пакетах одночасно, без ручної синхронізації.

- **pnpm workspaces** забезпечує локальне зв'язування пакетів через
  `workspace:*`.
- **Turborepo** оркеструє паралельні таски (`pnpm dev`, `pnpm build`,
  `pnpm lint`, `pnpm type-check`) і кешує їх.

### Відповідальність пакетів

| Пакет | Vue/Vite порт (dev) | Pages project (prod) | За що відповідає |
|---|---|---|---|
| `@brand-constructor/admin` | 5173 | `brand-constructor` | Адмін-UI бібліотек |
| `@brand-constructor/constructor` | 5174 | `brand-constructor-app` | Wizard, CEO/PO review, PDF-експорт |
| `@brand-constructor/worker` | 8787 (wrangler) | — (Worker `brand-constructor-api`) | REST API, D1, R2, Slack, Pananames |
| `@brand-constructor/shared` | — | — | Типи, константи, утиліти (`parseAspectRatio`, RBAC-мапи) |

---

## 3. Tech stack

| Шар | Технологія | Чому |
|---|---|---|
| Frontend (admin) | Vue 3 + TypeScript + Vite + SCSS + Pinia + Vue Router | Стандартний SPA-стек, повна типізація |
| Frontend (constructor) | Vue 3 + TypeScript + Vite + Tailwind CSS + SCSS + Pinia + Vue Router | Tailwind додано для wizard-екранів за дизайн-системою Figma |
| Backend | Cloudflare Workers + Hono.js | Edge runtime, 0 мс холодного старту, нативні D1/R2/Rate Limit бінди |
| База даних | Cloudflare D1 (SQLite) | Реляційні зв'язки між сутностями, JOIN, FK; зашита в Cloudflare |
| File storage | Cloudflare R2 | S3-сумісний, нульова вартість egress, нативна інтеграція з Workers |
| Auth | Google OAuth (ID token) + own JWT у HttpOnly cookie | Без сторонніх Auth-провайдерів, повний контроль над сесіями та RBAC |
| CSRF | HMAC-SHA256(JWT_SECRET, "csrf:<sub>:<iat>") | Stateless, без додаткового сховища |
| Валідація вхідних даних | Zod | Runtime-схеми для тіл API-запитів |
| Domain check | Pananames API (server-to-server) | Для перевірки доступності `.com`-доменів зовнішніх неймінгів |
| Слек | Slack Web API (`chat.postMessage`) | Сповіщення команд по етапах brand-flow |
| Build orchestrator | Turborepo + pnpm workspaces | Кешований білд монорепо |

---

## 4. Authentication & Security ⚠️

Цей розділ важливий для security review — попередня версія документа описувала
застарілу модель (Bearer + `localStorage`), яка **повністю видалена** під час
hardening (commits `8ff30a4` F-05, `9e823d9` F-25).

### 4.1 Login flow

1. Користувач натискає **Sign in with Google** на `/login`.
2. Google повертає ID-токен (JWT) у браузер.
3. Frontend `POST /api/auth/google` з тілом `{ credential }` (+ `credentials: 'include'`).
4. Worker:
   - перевіряє `AUTH_RATE_LIMITER` (Cloudflare Rate Limiting bind, 5 req / 60 s per IP);
   - валідує токен через `https://oauth2.googleapis.com/tokeninfo`;
   - перевіряє `email_verified === 'true'` і `aud === GOOGLE_CLIENT_ID`;
   - шукає email у таблиці `users` D1; якщо не знайдено → 403;
   - створює сесійний JWT (24 год) і виставляє його у HttpOnly cookie `bc_auth`;
   - в тілі відповіді повертає `user` + `csrfToken` (HMAC).
5. Frontend зберігає `csrfToken` лише в Pinia (in-memory).
6. На кожен mutating-запит (`POST`/`PUT`/`PATCH`/`DELETE`) frontend додає
   `X-CSRF-Token: <token>` + `credentials: 'include'`.

### 4.2 Auth middleware (`packages/worker/src/middleware/auth.ts`)

- Читає cookie `bc_auth`, верифікує JWT через `JWT_SECRET`.
- Старий fallback на `Authorization: Bearer` **видалено** (F-05 cleanup).
- При помилці → 401.

### 4.3 CSRF middleware (`packages/worker/src/middleware/csrf.ts`)

- Працює одразу після auth.
- No-op для safe methods (GET/HEAD/OPTIONS).
- Для решти methods:
  - перераховує `expected = HMAC_SHA256(JWT_SECRET, "csrf:" + jwt.sub + ":" + jwt.iat)`;
  - порівнює з `X-CSRF-Token` константно-часовим compare;
  - при невідповідності → 403.
- Стану не зберігає — токен детермінований.

### 4.4 Response headers

На кожну відповідь worker додає:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'; script-src 'self' https://accounts.google.com https://apis.google.com; frame-src https://accounts.google.com; connect-src 'self' https://oauth2.googleapis.com https://accounts.google.com
Cache-Control: no-store, no-cache, must-revalidate   (для /api/* крім /api/assets/*)
```

### 4.5 CORS

`packages/worker/src/middleware/cors.ts` — origin allowlist з `CORS_ORIGINS`
(comma-separated env), credentials дозволено.

### 4.6 Env isolation (F-26)

Production-бінди (D1, R2, vars, secrets, rate limit) існують **тільки** у блоці
`[env.production]` `wrangler.toml`. Default (top-level) environment навмисно
порожній — це гарантія, що випадковий `wrangler deploy` без `--env production`
впаде з помилкою, а не винесе production-D1 на публічний `*.workers.dev`.

### 4.7 Dev mode

Локально використовується **той самий** Google OAuth flow. `X-Dev-User-Email`
bypass, який існував раніше і був помічений зовнішнім security review (Anton
Zasteba) — повністю видалено (F-25). Cookie у dev-режимі виставляється без
`Secure` (бо `wrangler dev` слухає plain HTTP), все інше ідентично продакшну.

> Повний список Cloudflare-side hardening дій (rotate secrets, R2 ACL, WAF,
> Access policies) — у [`docs/security/CLOUDFLARE-HARDENING.md`](./security/CLOUDFLARE-HARDENING.md).

---

## 5. Database schema (D1, 10 таблиць)

| Таблиця | Призначення |
|---|---|
| `users` | Акаунти користувачів (`email`, `role`) |
| `concepts` | Візуальні концепти (10 gallery-слотів, `mode`, `used_in_brand_id`) |
| `external_namings` | Зовнішні назви брендів (`domain`, `price`, `availability_status`, опц. `concept_id`) |
| `internal_namings` | Внутрішні назви проєктів |
| `pr_packages` | PR/Marketing пакети (teams, timeline, expenses) |
| `component_types` | Категорії UI-компонентів (header, banners, thumbnails, tabbar, sidebar, theme) |
| `component_variants` | Варіанти UI-компонентів |
| `assets` | Метадані файлів у R2 (entity_type, entity_id, file_url, dimensions) |
| `brands` | Wizard state Product Owner: вибір на кожному кроці, CEO comments/selections, статус |
| `audit_log` | Історія дій (UI-переглядач ще не реалізовано) |

### Ключові зв'язки

- `external_namings.concept_id` → `concepts.id` (`ON DELETE SET NULL`)
- `component_variants.component_type_id` → `component_types.id` (`ON DELETE CASCADE`)
- `brands.concept_id` → `concepts.id`, `brands.pr_package_id` → `pr_packages.id` (обидва `SET NULL`)
- Усі сутності мають `created_by` → `users.id`
- На `concepts`, `external_namings`, `internal_namings`, `pr_packages`,
  `component_variants` є поле `used_in_brand_id` — після `PATCH brands/:id/status → approved`
  атомарним `db.batch` помічаються використані бібліотечні записи (F-04).

### Brand statuses

`draft` → `submitted` → (`needs_revision` ↔ `submitted`) → `approved`.

`PUT /api/brands/:id` на термінальних статусах (`approved`) повертає 409
(F-21).

Повний DDL — `packages/worker/src/db/schema.sql`, міграції — `packages/worker/src/db/migrations/`.

---

## 6. API endpoints

Base URL (prod): `https://brand-constructor-api-production.upstars-landings.workers.dev/api`

Всі `/api/*`, крім `/api/auth/*`, `/api/health` і `/api/assets/...`, вимагають
auth cookie. Всі mutating-запити вимагають `X-CSRF-Token`.

### Auth & health

| Метод | Endpoint | Auth | Опис |
|---|---|---|---|
| POST | `/auth/google` | ні (rate-limited) | Обмін Google ID-token на сесійну cookie + CSRF |
| POST | `/auth/logout` | так | Очищення cookie |
| GET | `/auth/me` | так | Поточний користувач + новий CSRF на reload |
| GET | `/health` | ні | Liveness probe |

### Users (admin only)

| Метод | Endpoint | Опис |
|---|---|---|
| GET | `/users` | Список |
| GET | `/users/me` | Поточний |
| POST | `/users` | Створити |
| PUT | `/users/:id` | Оновити роль |
| DELETE | `/users/:id` | Видалити |

### Library CRUD

| Endpoint | Methods |
|---|---|
| `/concepts`, `/concepts/:id` | GET, POST, PUT, DELETE |
| `/namings/external`, `/namings/external/:id` | GET, POST, PUT, DELETE |
| `/namings/internal`, `/namings/internal/:id` | GET, POST, PUT, DELETE |
| `/pr-packages`, `/pr-packages/:id` | GET, POST, PUT, DELETE |
| `/components/types`, `/components/types/:id` | GET, POST |
| `/components/types/:id/variants` | GET, POST |
| `/components/variants/:id` | PUT, DELETE |

RBAC примусово застосовується через `requireLibraryAccess(library)` middleware.

### Assets

| Метод | Endpoint | Auth | Опис |
|---|---|---|---|
| GET | `/assets/:entityType/:entityId/:fileName` | ні | Публічна віддача файлу з R2 (immutable cache) |
| POST | `/assets/upload` | так | Multipart: `file`, `entity_type`, `entity_id`, `file_type`, `slot`, `component_type_id?`, `aspect_ratio?` |
| DELETE | `/assets/:id` | так | Видалення з D1 + R2 (атомарно) |

### Brands (Constructor flow)

| Метод | Endpoint | Опис |
|---|---|---|
| GET | `/brands` | Список (фільтр за `created_by` / роллю) |
| GET | `/brands/:id` | Повний state бренду |
| POST | `/brands` | Створити чернетку |
| PUT | `/brands/:id` | Оновити wizard-state. На `approved` → 409 |
| DELETE | `/brands/:id` | Видалити |
| PATCH | `/brands/:id/status` | Перехід статусу (submit / approve / needs-revision). На `approved` атомарно: status + library `used_in_brand_id` + post-success Slack (F-04) |
| PATCH | `/brands/:id/ceo-selections` | CEO partial-revision selections |
| PATCH | `/brands/:id/ceo-comments/resolve` | PO marks CEO comment as resolved |

### Cron

`packages/worker/src/index.ts` реєструє `scheduled` handler: щодня о 06:00 UTC
викликає `batchCheckDomains(env)` — для всіх `external_namings` з `domain`
оновлює `availability_status` через Pananames API. Якщо
`PANANAMES_SIGNATURE` не сконфігурований — задача skip'иться без помилки.
Crontab: `[triggers] crons = ["0 6 * * *"]` у `wrangler.toml`.

---

## 7. Asset upload rules

Усе зберігається у R2 bucket `brand-constructor-assets` під ключем
`<entity_type>/<entity_id>/<file_name>`.

| Параметр | Значення |
|---|---|
| Max size (PNG) | 10 MB |
| Max size (SVG) | 2 MB |
| Дозволені формати | PNG, SVG (визначення через magic bytes у `utils/asset-validation.ts`) |

### Aspect ratio validation

Поле `aspect_ratio` парситься через `parseAspectRatio` з shared:
- порожнє → перевірка не виконується;
- `"16:9"` або `"1.5"` → tolerance ±1% від указаного значення.

Дефолти для UI-компонентів — у `packages/shared/src/constants/assets.ts`
(header 6.05, banners 1.9, thumbnails 2.14, tabbar 5.07, sidebar 0.47; theme
без валідації).

---

## 8. Roles & permissions (RBAC)

8 ролей у `packages/shared/src/constants/roles.ts`. Доступ перевіряється і
на frontend (видимість UI), і на backend (middleware). Backend завжди
повторно валідує.

| Роль | Код | BC Admin | Constructor wizard |
|---|---|---|---|
| Admin | `admin` | full | full |
| Head of DHC | `head_dhc` | full | full |
| Product Owner | `product_owner` | read-only | створити/редагувати свій бренд |
| CPO / CEO | `cpo_ceo` | read-only | approve / send-back / write CEO comments |
| Strategy & Identity | `strategy_identity` | концепти + неймінги | read approved |
| UI Designer | `ui_designer` | компоненти + варіанти | read approved |
| PR & Marketing | `pr_marketing` | PR-пакети | read approved |
| Product Designer | `product_designer` | read-only | read approved |

`LIBRARY_WRITE_PERMISSIONS` (shared) — мапа library → дозволені ролі;
`ADMIN_ROLES = [admin, head_dhc]`; `BRAND_APPROVAL_ROLES = [admin, head_dhc, cpo_ceo]`.

---

## 9. BC Admin (`packages/admin`)

```
packages/admin/src/
├── components/ui/            # BaseButton, BaseInput, BaseTextarea, BaseModal, AppHeader, AppSidebar
├── composables/
│   ├── useApi.ts             # fetch-обгортка з cookie + CSRF
│   └── useTableSort.ts
├── router/index.ts           # Routes + roles guard
├── stores/auth.ts            # Pinia: user, csrfToken, canWriteLibrary, isAdmin
├── styles/                   # _variables.scss, _mixins.scss, global.scss
└── views/                    # LoginView, ConceptsView, ConceptDetailView,
                              # NamingsView, PrPackagesView, ComponentsView,
                              # ComponentVariantsView, BrandsView, UsersView
```

### Routes (admin)

| Route | View | Доступ |
|---|---|---|
| `/login` | `LoginView` | публічний |
| `/concepts`, `/concepts/:id` | `ConceptsView`, `ConceptDetailView` | будь-який authenticated |
| `/namings` | `NamingsView` | будь-який authenticated |
| `/pr-packages` | `PrPackagesView` | будь-який authenticated |
| `/components`, `/components/:typeId` | `ComponentsView`, `ComponentVariantsView` | будь-який authenticated |
| `/brands` | `BrandsView` | будь-який authenticated (фільтр по ролі на сервері) |
| `/users` | `UsersView` | лише `admin` / `head_dhc` |

Pages Functions proxy `functions/api/[[path]].ts` пересилає `/api/*` на Worker
для same-origin cookie flow.

---

## 10. Brand Constructor app (`packages/constructor`)

```
packages/constructor/src/
├── views/
│   ├── LandingView.vue       # /
│   ├── LoginView.vue
│   ├── BrandSuccessView.vue
│   ├── ConstructorLayout.vue # /constructor/:brandId/...
│   ├── steps/                # BrandBasicsView, ConceptSelectionView,
│   │                         # ExternalNamingView, InternalNamingView,
│   │                         # DeliverablesView, MarketingPackageView,
│   │                         # VisualComponentsView, ReviewSubmitView
│   ├── po-edit/              # PoEditConceptView, ...ExternalNamingView, ...InternalNamingView
│   └── ceo-reselect/         # CeoReselectConceptView, ...ExternalNamingView, ...InternalNamingView
├── components/constructor/   # edit-flow, fields, layout, modals, preview, review,
│                             #   ceo-reselect — компоненти wizard
├── components/ui/             # SegmentedControl, SimpleModal, SectionStatusBadge,
│                              #   UnresolvedDot
├── composables/               # useApi, useBrandPreviewLayers, useCeoApplyVariants,
│                              #   useCeoReviewComments, usePoEditSnapshot,
│                              #   usePrintBrand (PDF), useReviewComponentSelections,
│                              #   useViewportScale
├── stores/                    # auth, libraries, constructor/* (split per F-08)
└── utils/log.ts, utils/stepMigration.ts
```

### Constructor flow

1. **Landing** → Product Owner входить через Google → переходить у новий бренд.
2. **Wizard (steps/)** — 8 кроків: Brand Basics → Concept → External naming →
   Internal naming → Deliverables → Marketing package → Visual components → Review.
3. **Review & submit** → бренд переходить у `submitted`, надсилається Slack
   до CEO.
4. **CEO flow (ceo-reselect/)** — CEO може approve, або переобрати з
   доступних опцій, або написати section-specific comment → бренд переходить у
   `needs_revision`.
5. **PO edit flow (po-edit/)** — PO бачить readonly CEO comments + може
   змінити вибір у скоупі коментаря → resubmit.
6. **Approve** — атомарний `db.batch` помічає бібліотечні записи `used`,
   надсилає фінальний Slack, бренд стає `approved` (read-only для всіх).
7. **PDF export** — `usePrintBrand` через `pdfmake` (lazy-loaded chunk).

### Routes (constructor)

Динамічні per-brand; ключові — `/`, `/login`, `/constructor/:brandId/steps/...`,
`/constructor/:brandId/review`, `/constructor/:brandId/po-edit/...`,
`/constructor/:brandId/ceo-reselect/...`, `/constructor/:brandId/success`.
Guards: `import.meta.env.DEV` обходить auth у `vite dev`, в продакшні —
завжди auth + role check (F-25).

---

## 11. Cloudflare resources

| Ресурс | Назва | ID | Бінд у Worker |
|---|---|---|---|
| Account | `upstars_landings` | `71bd6a3d109ad42e0973488dafe041b2` | — |
| Worker | `brand-constructor-api` | — | — |
| D1 Database | `brand-constructor-db` | `2aafe66b-27be-4058-9c09-e784efefa404` | `DB` |
| R2 Bucket | `brand-constructor-assets` | — | `ASSETS_BUCKET` |
| Rate Limit | `AUTH_RATE_LIMITER` | namespace `1001`, `5 / 60s` | `AUTH_RATE_LIMITER` |
| Pages — admin | `brand-constructor` | — | — |
| Pages — constructor | `brand-constructor-app` | — | — |

`account_id` навмисно опущено в `wrangler.toml` — береться з env
`CLOUDFLARE_ACCOUNT_ID` або з аутентифікованого профілю `wrangler`. Всі прод
бінди — лише під `[env.production]`.

---

## 12. Local development

### Вимоги

- Node.js **>= 20**
- pnpm **>= 9** (рекомендовано 9.15)
- Wrangler CLI (приходить з `@brand-constructor/worker` як devDep)
- Доступ до production Google OAuth client ID (для локального login flow)

### Налаштування

```bash
git clone git@github.com:viktor-hirenko/brand-constructor.git
cd brand-constructor
pnpm install
```

### Запуск

Окремі сервіси:

```bash
pnpm dev:worker        # http://localhost:8787 (wrangler dev --env production)
pnpm dev:admin         # http://localhost:5173
pnpm dev:constructor   # http://localhost:5174
```

Все одночасно через Turborepo:

```bash
pnpm dev               # стартує admin + constructor + worker паралельно
```

> `:5173` і `:5174` мають бути додані у Authorized JavaScript origins у
> Google Cloud Console для production `GOOGLE_CLIENT_ID`. Це одноразове
> налаштування на проєктному рівні.

### Скидання локальної бази даних

```bash
cd packages/worker
npx wrangler d1 execute brand-constructor-db --local --file=src/db/schema.sql
npx wrangler d1 execute brand-constructor-db --local --file=src/db/seed.sql
```

---

## 13. Deployment

### Worker (API)

```bash
pnpm deploy:worker:production
# еквівалентно:
cd packages/worker && npx wrangler deploy --env production
```

> **Завжди з `--env production`.** Без нього команда впаде (default env
> навмисно порожній — захист від випадкового публічного деплою на
> `*.workers.dev`).

### BC Admin (Pages)

```bash
pnpm build:admin
cd packages/admin
npx wrangler pages deploy dist --project-name brand-constructor
```

### Brand Constructor app (Pages)

```bash
pnpm deploy:constructor
# еквівалентно:
pnpm build:constructor
cd packages/constructor
npx wrangler pages deploy dist --project-name brand-constructor-app
```

### Все одразу

```bash
pnpm deploy:all   # worker + admin + constructor
```

> Frontend-апки білдять локально і деплоять через `wrangler pages deploy`,
> бо `VITE_*` env-зміннi запікаються в bundle на етапі build. Авто-деплой
> Cloudflare Pages з гіта не має доступу до цих значень.

---

## 14. Secrets & environment variables

### Worker (production)

Real secrets — у Cloudflare encrypted secrets (`wrangler secret put ... --env production`).
**Не у `wrangler.toml`, не в коді, не в git.**

| Назва | Тип | Де живе | Опис |
|---|---|---|---|
| `JWT_SECRET` | secret | Cloudflare | Підпис auth JWT і CSRF HMAC |
| `GOOGLE_CLIENT_ID` | var | `wrangler.toml [env.production]` | OAuth audience |
| `GOOGLE_CLIENT_SECRET` | secret | Cloudflare | OAuth client secret |
| `PANANAMES_SIGNATURE` | secret | Cloudflare | API signature для domain checks (опц.) |
| `SLACK_BOT_TOKEN` | secret | Cloudflare | Slack Web API token |
| `SLACK_CHANNEL_*` | secret | Cloudflare | Channel IDs per team / per stage (`SLACK_CHANNEL_STRATEGY`, `SLACK_CHANNEL_PR`, ...) |
| `ENVIRONMENT` | var | `wrangler.toml` | `"production"` / `"development"` |
| `CORS_ORIGINS` | var | `wrangler.toml` | comma-separated allowlist |
| `CONSTRUCTOR_URL` | var | `wrangler.toml` | URL constructor app для Slack deep-links |

### Worker (local dev)

`packages/worker/.dev.vars` (gitignored). Структура:

```
JWT_SECRET=<dev-only>
GOOGLE_CLIENT_ID=<same as prod for shared OAuth client>
GOOGLE_CLIENT_SECRET=<dev OR same>
SLACK_BOT_TOKEN=<optional>
SLACK_CHANNEL_*=<optional>
PANANAMES_SIGNATURE=<optional>
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
CONSTRUCTOR_URL=http://localhost:5174
```

### Frontend

`packages/admin/.env.production` і `packages/constructor/.env.production`
(gitignored):

```
VITE_API_URL=https://brand-constructor-api-production.upstars-landings.workers.dev
VITE_GOOGLE_CLIENT_ID=<google client id>
```

Локально — `*.env` (також gitignored).

---

## 15. Security notes

Стисло; повний P0/P1/P2 checklist Cloudflare-side дій — у
[`docs/security/CLOUDFLARE-HARDENING.md`](./security/CLOUDFLARE-HARDENING.md).

### Що зроблено в коді

- **Auth у HttpOnly cookie + CSRF HMAC** — без Bearer/localStorage (F-05).
- **Single auth path у dev і prod** — `X-Dev-User-Email` bypass видалений (F-25).
- **Env isolation** — production binds лише у `[env.production]` (F-26).
- **Атомарний approve** — один `db.batch` для status + library marks; Slack — після успіху (F-04).
- **CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy** на кожній відповіді.
- **`Cache-Control: no-store`** на всіх `/api/*` крім `/api/assets/*`.
- **Rate limit** `5 / 60s per IP` на `/api/auth/google`.
- **Origin allowlist** через `CORS_ORIGINS`.
- **Validation** — Zod-схеми (`packages/worker/src/schemas/`).
- **Terminal-state guard** — `PUT /brands/:id` на `approved` → 409 (F-21).
- **Google audience check** — `aud` валідується (F-25 follow-up commit `61a6d30`).

### Що потрібно зробити на Cloudflare side

Див. `docs/security/CLOUDFLARE-HARDENING.md`. Зокрема:
- rotate `PANANAMES_SIGNATURE` (історично leak'нувся через debug endpoint, F-01);
- R2 bucket Object Access — public read лише для шляхів `/<entity_type>/<entity_id>/...`;
- WAF rules на `/api/auth/google`;
- Cloudflare Access policy для `*.pages.dev` preview deploys.

### Локальні `.env*` і `.dev.vars`

Усі під `.gitignore`. Реальні значення никогда не комітяться. У git-історії
секретних значень немає (перевірено).

---

## 16. Operational notes

### Scheduled cron

`scheduled` handler у `packages/worker/src/index.ts`. Cron: `0 6 * * *`
(UTC). Викликає `batchCheckDomains(env)`:
- бере всі `external_namings` з непорожнім `domain`;
- для кожного звертається до Pananames API з підписом `PANANAMES_SIGNATURE`;
- оновлює `availability_status` (`available` / `taken` / `unknown`).

Якщо `PANANAMES_SIGNATURE` не сконфігурований, задача логує warning і
завершується (`isPananamesConfigured(env)` guard).

### Slack notifications

`packages/worker/src/utils/slack.ts` — declarative section-based renderer
(F-10). Викликається з `routes/brands.notifications.ts` на події:
- brand `submitted` → канали Strategy & Identity / PR / UI Designers (per вибраним секціям);
- `needs_revision` → канал PO;
- `approved` → всі залучені команди + summary з посиланнями на R2-ассети.

### Ручні скрипти

```bash
pnpm slack:cleanup:dry   # dry-run: показує, які повідомлення видалить
pnpm slack:cleanup       # реально видаляє історичні bot-повідомлення
```

Токен підвантажується автоматично з `packages/worker/.dev.vars`.

### Database migrations

`packages/worker/src/db/migrations/` — нумеровані SQL-файли. Для прода:

```bash
cd packages/worker
npx wrangler d1 execute brand-constructor-db --remote --env production \
  --file=src/db/migrations/00X_name.sql
```

---

## 17. Shared package

`@brand-constructor/shared` — внутрішній пакет, імпортується трьома іншими.

Експортує:

- **Types**: `User`, `UserRole`, `Concept`, `ExternalNaming`, `InternalNaming`,
  `PrPackage`, `ComponentType`, `ComponentVariant`, `Asset`, `Brand`,
  `BrandStatus`, `ApiResponse`, `ApiListResponse`, `ApiErrorResponse`.
- **Constants**: `USER_ROLES`, `ROLE_LABELS`, `ADMIN_ROLES`,
  `BRAND_APPROVAL_ROLES`, `LIBRARY_WRITE_PERMISSIONS`, `ASSET_CONSTRAINTS`,
  `PR_TEAMS`, `BRAND_STATUSES`.
- **Utils**: `parseAspectRatio(input: string): number | null`.

Імпорт: `import { ... } from '@brand-constructor/shared'` (workspace-link).

---

## 18. Scripts

### Корінь монорепо

```bash
pnpm dev                 # turbo dev — всі пакети паралельно
pnpm build               # turbo build
pnpm lint                # turbo lint
pnpm type-check          # turbo type-check

pnpm dev:admin           # лише admin
pnpm dev:constructor     # лише constructor
pnpm dev:worker          # лише worker

pnpm build:admin
pnpm build:constructor
pnpm build:worker

pnpm deploy              # worker + admin
pnpm deploy:constructor  # лише constructor
pnpm deploy:worker:production
pnpm deploy:all          # worker + admin + constructor

pnpm db:migrate
pnpm db:seed

pnpm slack:cleanup       # cleanup-slack-bot-messages.mjs
pnpm slack:cleanup:dry
```

---

## 19. Branch & history

Цей репозиторій пройшов одноразовий **clean-history reset** перед першим
push'ем у корпоративний GitHub:

- **`main`** (це те, що бачить GitHub) — 5+ логічних коммітів, від точки
  cleanup і далі. Це новий orphan-baseline.
- **`legacy/main`** (тільки локально) — повна dev-історія до cleanup (143
  комміти). Існує для збереження контексту і AI-аналізу «чому щось було
  зроблено саме так». **Не пушиться**.
- **`backup/main-pre-clean-<date>`**, **`backup/feature-...-pre-clean-<date>`**
  + однойменні теги — додаткові локальні snapshots на момент перед reset.
- **`.git.bak-<date>/`** — літеральна копія `.git` для аварійного rollback.
- AI-аудити, intermediate trackers, contextual docs для моделей живуть на
  диску, але **не комітяться** (`.git/info/exclude` — локальний exclude). Їх
  можна знайти у `docs/audit/`, `docs/audits/`, `docs/plans/`,
  `docs/PRD-IMPLEMENTATION-AUDIT-2026-03-18.md`, `docs/cloudflare-naming-cleanup.md`.

Для нових змін практика: feature-branch від `main`, PR в `main`, merge,
push. `legacy/main` — read-only архів старих рішень.

---

## 20. References & related docs

### Source-of-truth (історичні / продуктові)

- [`docs/product-spec/README.md`](./product-spec/README.md) — каталог PRD v1/v2,
  technical requirements, success metrics, PR-packages, Jira task.
- [`docs/TASK-REQUIREMENTS.md`](./TASK-REQUIREMENTS.md) — оригінальні вимоги
  до задачі.
- [`docs/design-audit/README.md`](./design-audit/README.md) — Figma screen
  mapping для wizard.

### Security

- [`docs/security/CLOUDFLARE-HARDENING.md`](./security/CLOUDFLARE-HARDENING.md)
  — P0/P1/P2 checklist Cloudflare-side actions за результатами external
  security review (2026-05-21).

### Historical snapshots (не living docs)

- [`docs/IMPLEMENTATION-PLAN.md`](./IMPLEMENTATION-PLAN.md) — план реалізації
  на 2026-02-24. Зберігається як snapshot, не оновлюється; актуальний стан —
  у цьому документі.
- [`docs/FUTURE-WORK.md`](./FUTURE-WORK.md) — список відкладеного, частково
  застарілий (Phase 2 / Brand entity вже реалізовані).
- [`docs/FLOW-AND-NOTIFICATIONS-ANALYSIS.md`](./FLOW-AND-NOTIFICATIONS-ANALYSIS.md)
  — аналіз flow і Slack-нотифікацій на 19 березня 2026.
