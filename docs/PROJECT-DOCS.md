# BC Admin — Документація проєкту

> **BC Admin** — внутрішня назва адмін-панелі Brand Constructor.  
> Посилання: https://brand-constructor.pages.dev

---

## 1. Що це за проєкт?

BC Admin — внутрішня адмін-панель для управління бібліотеками, що використовуються в системі Brand Constructor. Контент-команди (Strategy & Identity, UI Designers, PR & Marketing) використовують її для додавання та управління бібліотечним контентом: концептами, неймінгами, UI-компонентами та PR-пакетами.

Це **Фаза 1 (MVP)**: лише управління бібліотеками. Фаза 2 (конструктор брендів для Product Owners) описана у файлі [FUTURE-WORK.md](./FUTURE-WORK.md).

---

## 2. Архітектура

```
brand-constructor/
├── packages/
│   ├── frontend/          # Vue 3 SPA — інтерфейс адмін-панелі
│   ├── worker/            # Cloudflare Worker — REST API + бізнес-логіка
│   └── shared/            # TypeScript-типи та константи, спільні для frontend і worker
├── docs/                  # Документація проєкту
├── turbo.json             # Конфігурація пайплайну Turborepo
├── pnpm-workspace.yaml    # Конфігурація монорепозиторію pnpm
└── package.json           # Кореневі скрипти
```

### Чому монорепозиторій?

Frontend і backend спільно використовують TypeScript-типи (`Concept`, `User`, `PrPackage` тощо) та константи (ролі, дозволи). Зберігання їх в одному пакеті `shared` усуває розбіжності між шарами — будь-яка зміна інтерфейсу одразу відображається і у frontend, і у backend без ручної синхронізації.

**pnpm workspaces** забезпечує локальне зв'язування пакетів. **Turborepo** організовує паралельні білди та кешує їх для прискорення.

### Відповідальність кожного пакету

| Пакет | За що відповідає |
|---|---|
| `frontend` | Vue 3 SPA. Весь UI адмін-панелі: вьюшки, компоненти, стори, роутинг, стилі |
| `worker` | Cloudflare Worker. REST API з авторизацією, CRUD-роути, завантаження асетів у R2, запити до D1 |
| `shared` | TypeScript-інтерфейси, константи та дозволи, що використовуються і frontend, і worker |

---

## 3. Стек технологій

| Шар | Технологія | Чому |
|---|---|---|
| Frontend | Vue 3 + TypeScript + Vite | Компонентний SPA, швидкі білди, повна типізація |
| Стан frontend | Pinia | Офіційний менеджер стану Vue, простіший за Vuex |
| Стилі frontend | SCSS з BEM | Scoped-стилі, дизайн-токени через змінні |
| Backend | Cloudflare Workers + Hono.js | Не потрібен сервер, працює на edge глобально, 0мс холодного старту |
| База даних | Cloudflare D1 (SQLite) | Вбудована в Cloudflare, не потрібна окрема БД інфраструктура |
| Зберігання файлів | Cloudflare R2 | S3-сумісний, нульова вартість вихідного трафіку, нативна інтеграція з Workers |
| Кеш сесій | Cloudflare KV | Швидке сховище ключ-значення для JWT-токенів сесій |
| Валідація | Zod | Runtime-валідація схем для всіх тіл запитів API |

---

## 4. Авторизація

### Як це працює у продакшні

1. Користувач відкриває `brand-constructor.pages.dev` і натискає **Sign in with Google**
2. Google повертає ID-токен (JWT) у браузер
3. Frontend надсилає токен на `/api/auth/google`
4. Worker перевіряє токен за допомогою публічних ключів Google
5. Worker перевіряє, чи існує email користувача в таблиці `users` у D1
6. Якщо користувач існує → створюється сесійний JWT і повертається у відповідь
7. Frontend зберігає JWT у `localStorage` і надсилає його як `Authorization: Bearer <token>` у кожному API-запиті
8. `authMiddleware` Worker перевіряє JWT на кожному захищеному роуті і додає користувача до контексту запиту

### Чому Google OAuth + власний JWT (а не Cloudflare Access)?

Cloudflare Access (Zero Trust) розглядався, але вимагає прав Zero Trust адміністратора на Cloudflare-акаунті. Команда має обмежені права на акаунті, тому Google OAuth реалізований напряму. Власний JWT дає повний контроль над часом дії сесії, даними користувача та перевірками дозволів.

### Авторизація (RBAC)

Доступ контролюється полем `role` користувача, що зберігається в D1. Backend middleware перевіряє дозволи на кожній write-операції — frontend лише показує/ховає UI-елементи залежно від ролі, але backend завжди повторно валідує.

```typescript
// packages/shared/src/constants/roles.ts
LIBRARY_WRITE_PERMISSIONS = {
  concepts:           ['admin', 'head_dhc', 'strategy_identity'],
  external_namings:   ['admin', 'head_dhc', 'strategy_identity'],
  internal_namings:   ['admin', 'head_dhc', 'strategy_identity'],
  pr_packages:        ['admin', 'head_dhc', 'pr_marketing'],
  component_types:    ['admin', 'head_dhc', 'ui_designer'],
  component_variants: ['admin', 'head_dhc', 'ui_designer'],
}
```

### Хто може увійти?

Лише користувачі, чий email є в таблиці `users` у D1. Користувача додає вручну Admin у розділі Users адмін-панелі.

### Режим розробки

У локальній розробці (`ENVIRONMENT=development`) Worker пропускає перевірку токена і використовує першого admin-користувача з бази даних. Frontend надсилає заголовок `X-Dev-User-Email`.

---

## 5. Схема бази даних

9 таблиць у Cloudflare D1 (SQLite):

| Таблиця | Опис |
|---|---|
| `users` | Акаунти користувачів з ролями |
| `concepts` | Візуальні концепти (назва, опис, visual_url, logo_url) |
| `external_namings` | Зовнішні назви брендів, опціонально прив'язані до концепту |
| `internal_namings` | Внутрішні назви проєктів (завжди окремі) |
| `pr_packages` | PR/Marketing-пакети з командами та таймлайнами |
| `component_types` | Категорії UI-компонентів (Банери, Таббар, Сайдбар тощо) |
| `component_variants` | Варіанти UI-компонентів з thumbnail-зображеннями |
| `assets` | Метадані всіх завантажених файлів (шляхи в R2) |
| `audit_log` | Історія дій користувачів (UI-переглядач ще не реалізовано) |

### Ключові зв'язки

- `external_namings.concept_id` → `concepts.id` (опціональний many-to-one)
- `component_variants.component_type_id` → `component_types.id` (many-to-one)
- Всі сутності мають `created_by` → `users.id`

---

## 6. API-ендпоінти

Базова URL: `https://brand-constructor-api-production.upstars-marbella.workers.dev/api`

### Авторизація
| Метод | Ендпоінт | Авт. | Опис |
|---|---|---|---|
| POST | `/auth/google` | Ні | Обмін Google ID-токена на сесійний JWT |
| GET | `/health` | Ні | Перевірка стану сервісу |

### Користувачі
| Метод | Ендпоінт | Опис |
|---|---|---|
| GET | `/users` | Список всіх користувачів |
| GET | `/users/me` | Поточний користувач |
| POST | `/users` | Створити користувача (лише admin) |
| PUT | `/users/:id` | Змінити роль користувача (лише admin) |
| DELETE | `/users/:id` | Видалити користувача (лише admin) |

### Концепти
| Метод | Ендпоінт | Опис |
|---|---|---|
| GET | `/concepts` | Список всіх концептів |
| GET | `/concepts/:id` | Концепт з неймінгами та асетами |
| POST | `/concepts` | Створити концепт |
| PUT | `/concepts/:id` | Оновити концепт |
| DELETE | `/concepts/:id` | Видалити концепт |

### Неймінги
| Метод | Ендпоінт | Опис |
|---|---|---|
| GET | `/namings/external` | Список зовнішніх неймінгів |
| GET | `/namings/internal` | Список внутрішніх неймінгів |
| POST | `/namings/external` | Створити зовнішній неймінг |
| POST | `/namings/internal` | Створити внутрішній неймінг |
| PUT | `/namings/external/:id` | Оновити зовнішній неймінг |
| PUT | `/namings/internal/:id` | Оновити внутрішній неймінг |
| DELETE | `/namings/external/:id` | Видалити зовнішній неймінг |
| DELETE | `/namings/internal/:id` | Видалити внутрішній неймінг |

### PR-пакети
| Метод | Ендпоінт | Опис |
|---|---|---|
| GET | `/pr-packages` | Список пакетів |
| GET | `/pr-packages/:id` | Деталі пакету |
| POST | `/pr-packages` | Створити пакет |
| PUT | `/pr-packages/:id` | Оновити пакет |
| DELETE | `/pr-packages/:id` | Видалити пакет |

### UI-компоненти
| Метод | Ендпоінт | Опис |
|---|---|---|
| GET | `/components/types` | Список типів компонентів |
| GET | `/components/types/:id/variants` | Варіанти для типу |
| POST | `/components/types` | Створити тип компонента |
| POST | `/components/types/:id/variants` | Створити варіант |
| PUT | `/components/types/:id` | Оновити тип |
| PUT | `/components/variants/:id` | Оновити варіант |
| DELETE | `/components/types/:id` | Видалити тип |
| DELETE | `/components/variants/:id` | Видалити варіант |

### Асети
| Метод | Ендпоінт | Опис |
|---|---|---|
| GET | `/assets/:entityType/:entityId/:fileName` | Отримати файл (без авт. — публічний доступ) |
| POST | `/assets/upload` | Завантажити файл (потрібна авт.) |
| DELETE | `/assets/:entityType/:entityId/:fileName` | Видалити файл |

---

## 7. Завантаження асетів

Всі завантажені файли зберігаються у бакеті **Cloudflare R2** `brand-constructor-assets`.

### Правила валідації

| Параметр | Значення |
|---|---|
| Максимальний розмір файлу | 5 МБ |
| Дозволені формати | PNG, SVG |
| Мінімальні розміри | 100×100 пікселів |
| Допуск співвідношення сторін | ±5% |

### Співвідношення сторін за типом асета

| Асет | Співвідношення |
|---|---|
| Візуал концепту | 16:9 |
| Лого концепту | 1:1 |
| Preview концепту | 4:3 |
| Thumbnail компонента | 1:1 |
| Preview компонента | 16:9 |

---

## 8. Ролі та права доступу

Визначено 8 ролей. Доступ перевіряється і на frontend (видимість UI), і на backend (middleware).

| Роль | Код | Що можна робити в BC Admin |
|---|---|---|
| Admin | `admin` | Повний доступ до всього |
| Head of DHC | `head_dhc` | Повний доступ до всього |
| Product Owner | `product_owner` | Тільки перегляд |
| CPO / CEO | `cpo_ceo` | Тільки перегляд |
| Strategy & Identity | `strategy_identity` | Додавати/редагувати концепти та неймінги |
| UI Designer | `ui_designer` | Додавати/редагувати типи компонентів та варіанти |
| PR & Marketing | `pr_marketing` | Додавати/редагувати PR-пакети |
| Product Designer | `product_designer` | Тільки перегляд |

Ролі призначає Admin у розділі Users.

---

## 9. Структура frontend

```
packages/frontend/src/
├── components/
│   └── ui/              # Базові компоненти для повторного використання
│       ├── BaseButton.vue
│       ├── BaseInput.vue
│       ├── BaseTextarea.vue
│       ├── BaseModal.vue
│       ├── AppHeader.vue
│       └── AppSidebar.vue
├── composables/
│   └── useApi.ts        # Обгортка fetch з auth-заголовками: useApiList, apiPut, apiUpload
├── router/
│   └── index.ts         # Роути Vue Router з auth-guard
├── stores/
│   └── auth.ts          # Pinia store: поточний користувач, JWT, canWriteLibrary()
├── styles/
│   ├── _variables.scss  # Дизайн-токени (кольори, відступи, типографіка)
│   ├── _mixins.scss     # SCSS-міксини
│   └── global.scss      # Глобальні ресети та базові стилі
└── views/               # Один файл на сторінку
    ├── LoginView.vue
    ├── ConceptsView.vue
    ├── ConceptDetailView.vue
    ├── NamingsView.vue
    ├── PrPackagesView.vue
    ├── ComponentsView.vue
    ├── ComponentVariantsView.vue
    └── UsersView.vue
```

### Роутинг

| Роут | Вьюшка | Хто має доступ |
|---|---|---|
| `/login` | `LoginView` | Публічний |
| `/concepts` | `ConceptsView` | Всі авторизовані |
| `/concepts/:id` | `ConceptDetailView` | Всі авторизовані |
| `/namings` | `NamingsView` | Всі авторизовані |
| `/pr-packages` | `PrPackagesView` | Всі авторизовані |
| `/components` | `ComponentsView` | Всі авторизовані |
| `/components/:id` | `ComponentVariantsView` | Всі авторизовані |
| `/users` | `UsersView` | Лише Admin, Head of DHC |

---

## 10. Cloudflare-ресурси

| Ресурс | Назва | ID |
|---|---|---|
| D1 Database | brand-constructor-db | `2aafe66b-27be-4058-9c09-e784efefa404` |
| R2 Bucket | brand-constructor-assets | — |
| KV Namespace | SESSIONS | `c4531fb03f2947418c131880e7ba4a36` |
| CF Account | upstars_landings | `71bd6a3d109ad42e0973488dafe041b2` |

---

## 11. Локальна розробка

### Вимоги

- Node.js 18+
- pnpm 8+

### Налаштування

```bash
git clone <repo>
cd brand-constructor
pnpm install
pnpm dev
```

Це запускає:
- Frontend: http://localhost:5173
- Worker: http://localhost:8787

### Скидання локальної бази даних

```bash
cd packages/worker
npx wrangler d1 execute brand-constructor-db --local --file=src/db/schema.sql
npx wrangler d1 execute brand-constructor-db --local --file=src/db/seed.sql
```

### Змінні середовища

**Worker** (`packages/worker/wrangler.toml`):
```toml
[vars]
ENVIRONMENT = "development"   # для локальної розробки
CORS_ORIGIN = "http://localhost:5173"

[env.production]
vars = { ENVIRONMENT = "production", CORS_ORIGIN = "https://brand-constructor.pages.dev" }
```

> ⚠️ Ніколи не змінювати `ENVIRONMENT` у блоці `[env.production]` на `development` — це вимкне авторизацію у продакшні.

**Frontend** (`packages/frontend/.env.production`):
```
VITE_API_URL=https://brand-constructor-api-production.upstars-marbella.workers.dev
VITE_GOOGLE_CLIENT_ID=<your-google-client-id>
```

---

## 12. Деплой

### Деплой Worker (API)

```bash
cd packages/worker
npx wrangler deploy --env production
```

### Деплой Frontend

```bash
cd brand-constructor
pnpm build:frontend
cd packages/frontend
npx wrangler pages deploy dist --project-name brand-constructor
```

> **Важливо:** Frontend потрібно білдити локально і деплоїти через `wrangler pages deploy`, оскільки `VITE_GOOGLE_CLIENT_ID` має бути вбудований під час білду (Vite запікає env-змінні в bundle). Автодеплой Cloudflare Pages через git не має доступу до цієї змінної під час білду.

---

## 13. Спільний пакет

`@brand-constructor/shared` — внутрішній пакет, що імпортується і `frontend`, і `worker`.

Експортує:
- **Types**: `User`, `Concept`, `ExternalNaming`, `InternalNaming`, `PrPackage`, `ComponentType`, `ComponentVariant`, `Asset`, `ApiResponse`, `ApiListResponse`
- **Constants**: `USER_ROLES`, `ROLE_LABELS`, `LIBRARY_WRITE_PERMISSIONS`, `ASSET_CONSTRAINTS`, `PR_TEAMS`

---

## 14. Скрипти

### Корінь монорепо
```bash
pnpm dev             # Запустити всі пакети у режимі розробки (паралельно)
pnpm build           # Збілдити всі пакети
pnpm build:frontend  # Збілдити лише frontend
pnpm lint            # Перевірити всі пакети лінтером
pnpm typecheck       # TypeScript-перевірка всіх пакетів
```

### Тільки Worker
```bash
cd packages/worker
pnpm dev             # Локальний worker на :8787
pnpm deploy          # Деплой на Cloudflare
```

### Тільки Frontend
```bash
cd packages/frontend
pnpm dev             # Vite dev-сервер на :5173
pnpm build           # Production-білд → dist/
pnpm preview         # Перегляд production-білду локально
```

---

## 15. Заплановані задачі

Дивись [FUTURE-WORK.md](./FUTURE-WORK.md) — повний список запланованих фіч з поясненням чому вони відкладені.
