# Brand Constructor — План реалізації

**Статус документа**: Активний план реалізації  
**Останнє оновлення**: 2026-02-24

---

## Архітектурні рішення

### Стек технологій

- **Frontend**: Vue 3 + TypeScript + Vite + SCSS + Pinia + Vue Router
- **Backend API**: Cloudflare Worker + Hono.js (lightweight, TypeScript-first фреймворк для Workers)
- **Database**: Cloudflare D1 (SQLite) — реляційні зв'язки між сутностями
- **File Storage**: Cloudflare R2 — для асетів бібліотек (PNG, SVG)
- **Auth**: Google OAuth + власний JWT

### Чому ці рішення

- **D1 замість KV** для даних: сутності пов'язані між собою (naming → concept, variant → component_type). SQL з JOIN/FK — єдиний розумний шлях
- **Hono.js** для Worker: TypeScript-native, вбудована підтримка D1/R2 bindings, middleware для auth, валідація через Zod
- **Монорепо** з pnpm workspaces: shared types між фронтом і worker, один CI/CD пайплайн
- **Google OAuth** для auth: Google OAuth напряму — повний контроль над сесіями, ролями та дозволами без зовнішніх залежностей

### Скоуп задачі

**ВХОДИТЬ (ця задача):**

- [x] Cloudflare інфраструктура (R2, D1, Worker)
- [x] Google OAuth автентифікація + JWT-сесії
- [x] Адмін-панель для управління 5 бібліотеками
- [x] Зв'язування сутностей між бібліотеками
- [x] Завантаження/валідація асетів (PNG/SVG, формат, розміри)
- [x] Рольова модель доступу (8 ролей, RBAC)

**НЕ ВХОДИТЬ (окрема задача пізніше):**

- 9-кроковий wizard конструктора брендів (Product Owner flow)
- Live Preview мобільного шаблону казино
- Інтеграції (Confluence, Slack, Jira)
- Approval flow (CPO/CEO)

---

## Структура монорепозиторію

```
brand-constructor/
├── docs/                        # Документація проєкту
│   ├── TASK-REQUIREMENTS.md     # Оригінальна задача + Product Concept v1.0
│   ├── IMPLEMENTATION-PLAN.md   # Цей файл
│   ├── PROJECT-DOCS.md          # Технічна документація проєкту
│   ├── FUTURE-WORK.md           # Що не реалізовано і чому
│   └── product-spec/            # Оригінальна продуктова документація
│       ├── README.md            # Індекс документів з маппінгом scope
│       ├── jira-task.md         # Текст задачі з Jira
│       ├── v1-product-concept.md
│       ├── v2-prd.md
│       ├── technical-requirements.md
│       ├── success-metrics.md
│       ├── pr-packages-detailed.md
│       ├── v2-technical-requirements.md
│       ├── v2-future-enhancements.md
│       └── assets/              # Flow-діаграми з FigJam
├── packages/
│   ├── frontend/                # Vue 3 + Vite адмін-панель
│   │   ├── src/
│   │   │   ├── assets/
│   │   │   ├── components/ui/
│   │   │   ├── composables/
│   │   │   ├── views/
│   │   │   ├── stores/
│   │   │   ├── router/
│   │   │   ├── types/
│   │   │   └── styles/
│   │   ├── vite.config.ts
│   │   └── package.json
│   ├── worker/                  # Cloudflare Worker API
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── routes/
│   │   │   ├── middleware/
│   │   │   ├── db/
│   │   │   └── utils/
│   │   ├── wrangler.toml
│   │   └── package.json
│   └── shared/                  # Спільні TypeScript-типи та константи
│       ├── src/
│       │   ├── types/
│       │   └── constants/
│       └── package.json
├── package.json                 # Root workspace config
├── pnpm-workspace.yaml
└── turbo.json
```

---

## Модель даних (D1 Schema)

### Таблиці (9)

- `users` — користувачі та ролі
- `concepts` — концепти брендів
- `external_namings` — зовнішні неймінги (можуть бути прив'язані до концепту)
- `internal_namings` — внутрішні неймінги
- `pr_packages` — PR-пакети (6 штук)
- `component_types` — типи UI-компонентів (banner, tabbar, header тощо)
- `component_variants` — варіанти кожного типу компонента
- `assets` — метадані завантажених файлів
- `audit_log` — історія дій користувачів

### Індекси (10)

- `idx_concepts_status`, `idx_concepts_created_by`
- `idx_external_namings_concept_id`, `idx_external_namings_status`
- `idx_internal_namings_status`
- `idx_component_variants_type_id`, `idx_component_variants_status`
- `idx_assets_entity`
- `idx_audit_log_entity`, `idx_audit_log_user`

### Ролі користувачів

- `admin` — повний доступ
- `head_dhc` — повний доступ
- `strategy_identity` — концепти + неймінги
- `ui_designer` — UI-компоненти
- `pr_marketing` — PR-пакети
- `product_owner`, `cpo_ceo`, `product_designer` — тільки перегляд

---

## API-ендпоінти

### Автентифікація (без JWT)

- `POST /api/auth/google` — обмін Google ID-токена на сесійний JWT
- `POST /api/auth/logout` — вихід із системи
- `GET /api/health` — перевірка стану сервісу

### Користувачі (потрібна авт.)

- `GET /api/users/me` — поточний користувач
- `GET /api/users` — список всіх (лише admin)
- `POST /api/users` — створити користувача (лише admin)
- `PUT /api/users/:id` — оновити користувача (лише admin)
- `DELETE /api/users/:id` — видалити користувача (лише admin)

### Концепти

- `GET /api/concepts` — список із фільтрами
- `GET /api/concepts/:id` — деталі з неймінгами та асетами
- `POST /api/concepts` — створити
- `PUT /api/concepts/:id` — оновити
- `DELETE /api/concepts/:id` — видалити

### Неймінги

- `GET /api/namings/external` — список зовнішніх (фільтри: linked/standalone)
- `GET /api/namings/internal` — список внутрішніх
- `POST /api/namings/external` — створити зовнішній
- `POST /api/namings/internal` — створити внутрішній
- `PUT /api/namings/external/:id` — оновити (включно з прив'язкою до концепту через `concept_id`)
- `PUT /api/namings/internal/:id` — оновити
- `DELETE /api/namings/external/:id` — видалити
- `DELETE /api/namings/internal/:id` — видалити

### PR-пакети

- `GET /api/pr-packages` — список
- `GET /api/pr-packages/:id` — деталі
- `POST /api/pr-packages` — створити
- `PUT /api/pr-packages/:id` — оновити
- `DELETE /api/pr-packages/:id` — видалити

### UI-компоненти

- `GET /api/components/types` — список типів із кількістю варіантів
- `POST /api/components/types` — створити тип
- `GET /api/components/types/:id/variants` — варіанти типу
- `POST /api/components/types/:id/variants` — створити варіант
- `PUT /api/components/variants/:id` — оновити варіант
- `DELETE /api/components/variants/:id` — видалити варіант

### Асети

- `GET /api/assets/:entityType/:entityId/:fileName` — отримати файл (публічний, без авт.)
- `POST /api/assets/upload` — завантажити файл (потрібна авт.)
- `DELETE /api/assets/:id` — видалити асет за ID з бази

---

## Валідація асетів

При завантаженні зображень Worker перевіряє:

1. **Формат**: тільки PNG і SVG (mime type + magic bytes)
2. **Розмір файлу**: макс. 10 МБ для PNG, 2 МБ для SVG
3. **Мінімальні розміри**: залежать від типу сутності (від 100×20 для component thumbnails до 300×300 для concept visuals)
4. **Aspect ratio** (опціонально через поле вводу):
   - Користувач вказує очікуване співвідношення сторін у полі "Співвідношення сторін" (формат: `1.9` або `16:9`)
   - **Поле заповнене** — перевірка з tolerance ±1% від вказаного значення
   - **Поле порожнє** — перевірка не виконується, дозволяється будь-яке співвідношення
   - Для UI-компонентів поле prefill значенням з конфігу (Header 6.05, Banners 1.9, Thumbnails 2.14, Tabbar 5.07, Sidebar 0.47)

При невідповідності вимогам API повертає HTTP 400 з текстом помилки, frontend показує її через нативний браузерний `alert()`.

---

## Фази реалізації

### Фаза 1: Інфраструктура + Scaffold

- [x] Створити монорепо, налаштувати pnpm workspaces + turbo
- [x] Створити структуру директорій
- [x] Shared types package (types + constants: ролі, статуси, асети)
- [x] Scaffold Worker з Hono.js + базові bindings (D1, R2)
- [x] Scaffold Vue 3 + Vite проєкт (router, pinia, SCSS)
- [x] D1 schema + міграція + seed-дані
- [x] Створити Cloudflare R2 bucket
- [x] Налаштувати Google OAuth автентифікацію

**Статус**: ✅ Завершена

### Фаза 2: Бібліотека концептів + асети

- [x] CRUD API для concepts у Worker (GET list, GET detail, POST, PUT, DELETE)
- [x] Upload/delete асетів через R2 API (POST /api/assets/upload, DELETE)
- [x] Валідація асетів (format detection, dimensions, file size)
- [x] Vue: ConceptsView — список із фільтрами, створення, видалення
- [x] Vue: ConceptDetailView — детальна сторінка, редагування, upload асетів
**Статус**: ✅ Завершена

### Фаза 3: Naming бібліотеки + зв'язування

- [x] CRUD API для external namings (GET з фільтрами linked/standalone, POST, PUT, DELETE)
- [x] CRUD API для internal namings (GET, POST, PUT, DELETE)
- [x] Зв'язування external naming з concept (FK concept_id, валідація)
- [x] Vue: NamingsView — таби external/internal, фільтри, таблиця, створення, видалення

**Статус**: ✅ Завершена

### Фаза 4: PR-пакети

- [x] CRUD API для PR-пакетів (GET list sorted by number, POST, PUT, DELETE)
- [x] Vue: PrPackagesView — картки з create/edit модалом та формою
- [x] Форма: number, name, description, teams, requirements, goals, components, timeline, expenses

**Статус**: ✅ Завершена

### Фаза 5: UI-компоненти

- [x] CRUD API для component_types (GET with variant_count, POST)
- [x] CRUD API для component_variants (GET by type, POST, PUT, DELETE)
- [x] Vue: ComponentsView — grid типів із кількістю варіантів
- [x] Vue: ComponentVariantsView — варіанти типу, upload thumbnail, видалення

**Статус**: ✅ Завершена

### Фаза 6: Ролі + автентифікація + polish

- [x] Google OAuth автентифікація (верифікація ID-токена, власний JWT)
- [x] authMiddleware (JWT-перевірка + dev-mode fallback)
- [x] requireLibraryAccess middleware — перевірка ролі для кожної бібліотеки
- [x] requireAdmin middleware для user management
- [x] Vue: LoginView — Google Sign-In
- [x] Vue: UsersView — управління користувачами та ролями (лише admin)
- [x] Логіка архівування (used_in_brand_id — підготовлено для Phase 2)
- [x] Audit log (audit_log таблиця з user_id, action, entity_type, entity_id)
- [x] LIBRARY_WRITE_PERMISSIONS map у shared constants
- [x] Responsive design для мобільних та планшетів

**Статус**: ✅ Завершена

---

## Changelog

### 2026-02-27

- Додано поле "Співвідношення сторін" до форм завантаження зображень (ConceptDetailView, ComponentVariantsView)
- Реалізовано опціональну валідацію aspect ratio з tolerance ±1%
- Додано утиліту `parseAspectRatio()` у shared пакет (підтримує формати `1.9` та `16:9`)
- Для UI-компонентів поле prefill значенням з конфігурації
- Оновлено повідомлення про помилки валідації (консистентний decimal формат)

### 2026-02-24

- Оновлено документацію: переклад на українську, виправлення невідповідностей з кодом
- Додано responsive design для мобільних та планшетів (bottom-sheet модалки, viewport units)
- Додано product-spec/ з оригінальною продуктовою документацією

### 2026-02-22

- Стандартизовано відображення автора/дати у всіх views
- Відновлено upload лого в ConceptDetailView
- Переписано PROJECT-DOCS та FUTURE-WORK на українську

### 2026-02-21

- Всі 6 фаз реалізовані
- Worker API: 7 модулів роутів (auth, concepts, namings, pr-packages, components, assets, users)
- Frontend: 8 views, базові UI-компоненти, router, pinia store, useApi composable
- D1 schema: 9 таблиць + 10 індексів, seed з users + component types
- Auth: Google OAuth + JWT middleware + role-based library access
- Asset validation: format detection (PNG magic bytes, SVG XML), dimensions, file size

### 2026-02-19

- Створено проєкт і документацію
- Розпочато Фазу 1: Інфраструктура + Scaffold
