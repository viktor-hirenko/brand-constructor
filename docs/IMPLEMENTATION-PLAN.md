# Brand Constructor - Implementation Plan

**Статус документа**: Активный план реализации  
**Последнее обновление**: 2026-02-19

---

## Архитектурные решения

### Стек технологий
- **Frontend**: Vue 3 + TypeScript + Vite + SCSS + Pinia + Vue Router
- **Backend API**: Cloudflare Worker + Hono.js (lightweight, TypeScript-first фреймворк для Workers)
- **Database**: Cloudflare D1 (SQLite) -- реляционные связи между сущностями
- **File Storage**: Cloudflare R2 -- для ассетов библиотек (PNG, SVG)
- **Cache/Sessions**: Cloudflare KV -- для сессий аутентификации и кеша
- **Auth**: Cloudflare Access (Zero Trust) + app-level роли в D1

### Почему эти решения
- **D1 вместо KV** для данных: сущности связаны между собой (naming -> concept, variant -> component_type). SQL с JOIN/FK -- единственный разумный путь
- **Hono.js** для Worker: TypeScript-native, встроенная поддержка D1/R2/KV bindings, middleware для auth, валидация через Zod
- **Monorepo** с pnpm workspaces: shared types между фронтом и worker, один CI/CD пайплайн
- **Cloudflare Access** для auth: панель на dev-домене, CF Access -- нативная защита без кода

### Скоуп задачи

**ВХОДИТ (эта задача):**
- [x] Cloudflare инфраструктура (R2, D1, Worker, Access)
- [ ] Админ-панель для управления 5 библиотеками
- [ ] Связывание сущностей между библиотеками
- [ ] Загрузка/валидация ассетов (PNG/SVG, aspect ratio)
- [ ] Базовая модель ролей

**НЕ ВХОДИТ (отдельная задача позже):**
- 9-шаговый wizard конструктора брендов (Product Owner flow)
- Live Preview мобильного шаблона казино
- Интеграции (Confluence, Slack, Jira)
- Approval flow (CPO/CEO)

---

## Структура монорепозитория

```
brand-constructor/
├── docs/                      # Документация проекта
│   ├── TASK-REQUIREMENTS.md   # Оригинальная задача
│   └── IMPLEMENTATION-PLAN.md # Этот файл
├── packages/
│   ├── frontend/              # Vue 3 + Vite админ-панель
│   │   ├── src/
│   │   │   ├── assets/
│   │   │   ├── components/
│   │   │   │   ├── ui/
│   │   │   │   ├── concepts/
│   │   │   │   ├── namings/
│   │   │   │   ├── pr-packages/
│   │   │   │   └── ui-components/
│   │   │   ├── composables/
│   │   │   ├── views/
│   │   │   ├── stores/
│   │   │   ├── router/
│   │   │   ├── types/
│   │   │   └── styles/
│   │   ├── vite.config.ts
│   │   └── package.json
│   ├── worker/                # Cloudflare Worker API
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── routes/
│   │   │   ├── middleware/
│   │   │   ├── db/
│   │   │   └── utils/
│   │   ├── wrangler.toml
│   │   └── package.json
│   └── shared/                # Shared TypeScript types
│       ├── src/
│       │   ├── types/
│       │   └── constants/
│       └── package.json
├── package.json               # Root workspace config
├── pnpm-workspace.yaml
└── turbo.json
```

---

## Модель данных (D1 Schema)

### Таблицы
- `users` - пользователи и роли
- `concepts` - концепты брендов
- `external_namings` - внешние неймінги (могут быть привязаны к концепту)
- `internal_namings` - внутренние неймінги
- `pr_packages` - PR-пакеты (6 штук)
- `component_types` - типы UI-компонентов (banner, tabbar, header, etc.)
- `component_variants` - варианты каждого типа компонента
- `assets` - метаданные загруженных файлов

### Роли пользователей
- `admin` -- полный доступ
- `head_dhc` -- полный доступ
- `strategy_identity` -- концепты + неймінги
- `ui_designer` -- UI компоненты
- `pr_marketing` -- PR пакеты
- `product_owner`, `cpo_ceo`, `product_designer` -- только просмотр

---

## API эндпоинты

- `GET/POST /api/concepts` -- список / создание концептов
- `GET/PUT/DELETE /api/concepts/:id` -- CRUD одного концепта
- `POST /api/concepts/:id/namings` -- привязать naming к концепту
- `GET/POST /api/namings/external` -- внешние неймінги
- `GET/POST /api/namings/internal` -- внутренние неймінги
- `GET/PUT/DELETE /api/namings/:type/:id` -- CRUD неймінга
- `GET/POST /api/pr-packages` -- PR-пакеты
- `GET/PUT/DELETE /api/pr-packages/:id`
- `GET/POST /api/component-types` -- типы компонентов
- `GET/POST /api/component-types/:id/variants` -- варианты
- `GET/PUT/DELETE /api/component-variants/:id`
- `POST /api/assets/upload` -- загрузка файла в R2
- `DELETE /api/assets/:id` -- удаление ассета
- `GET /api/users` -- список пользователей (admin)
- `PUT /api/users/:id/role` -- назначение роли (admin)
- `GET /api/me` -- текущий пользователь + роль

---

## Валидация ассетов

При загрузке изображений Worker проверяет:
1. **Формат**: только PNG и SVG (mime type + magic bytes)
2. **Размер файла**: макс 10MB для PNG, 2MB для SVG
3. **Aspect ratio**: зависит от типа сущности
4. **Dimensions**: минимальные размеры для качества

Тестовые aspect ratio:
- Concept visual: 16:9 (баннерный формат)
- Concept logo: 1:1 (квадрат)
- Component thumbnail: 4:3
- Component preview: 9:16 (мобильный формат)

---

## Фазы реализации

### Фаза 1: Инфраструктура + Scaffold
- [x] Создать monorepo, настроить pnpm workspaces + turbo
- [x] Создать структуру директорий
- [x] Shared types package (types + constants: roles, statuses, assets)
- [x] Scaffold Worker с Hono.js + базовые bindings (D1, R2, KV)
- [x] Scaffold Vue 3 + Vite проект (router, pinia, SCSS)
- [x] D1 schema + миграция + seed-данные
- [ ] Создать Cloudflare R2 bucket через wrangler (remote, нужен доступ к CF account)
- [ ] Настроить Cloudflare Access на dev-домене (нужен доступ к CF account)

**Статус**: ✅ Завершена (локальная инфра работает, remote CF ресурсы ожидают доступ)

### Фаза 2: Библиотека концептов + ассеты
- [x] CRUD API для concepts в Worker (GET list, GET detail, POST, PUT, DELETE)
- [x] Upload/delete ассетов через R2 API (POST /api/assets/upload, DELETE)
- [x] Валидация ассетов (format detection, aspect ratio, dimensions, file size)
- [x] Vue: ConceptsView -- список с фильтрами, создание, удаление
- [x] Vue: ConceptDetailView -- детальная страница, редактирование, upload ассетов
- [x] Vue: ConceptCard + StatusBadge компоненты

**Статус**: ✅ Завершена

### Фаза 3: Naming библиотеки + связывание
- [x] CRUD API для external namings (GET с фильтрами linked/standalone, POST, PUT, DELETE)
- [x] CRUD API для internal namings (GET, POST, PUT, DELETE)
- [x] Связывание external naming с concept (FK concept_id, валидация)
- [x] Vue: NamingsView -- табы external/internal, фильтры, таблица, создание, удаление

**Статус**: ✅ Завершена

### Фаза 4: PR-пакеты
- [x] CRUD API для PR-пакетов (GET list sorted by number, POST, PUT, DELETE)
- [x] Vue: PrPackagesView -- карточки с create/edit модалом и формой
- [x] Форма: number, name, description, teams, goals, components, timeline, expenses

**Статус**: ✅ Завершена

### Фаза 5: UI-компоненты
- [x] CRUD API для component_types (GET with variant_count, POST)
- [x] CRUD API для component_variants (GET by type, POST, PUT, DELETE)
- [x] Vue: ComponentsView -- grid типов с количеством вариантов
- [x] Vue: ComponentVariantsView -- варианты типа, upload thumbnail, удаление

**Статус**: ✅ Завершена

### Фаза 6: Роли + архивирование + polish
- [x] Auth middleware (CF Access JWT + dev-mode fallback)
- [x] requireLibraryAccess middleware -- проверка роли для каждой библиотеки
- [x] requireAdmin middleware для user management
- [x] Vue: UsersView -- управление пользователями и ролями (admin only)
- [x] Логика архивирования (used_in_brand_id -> cannot delete/modify)
- [x] Audit log (audit_log таблица с user_id, action, entity_type, entity_id)
- [x] LIBRARY_WRITE_PERMISSIONS map в shared constants

**Статус**: ✅ Завершена

---

## Changelog

### 2026-02-21
- Все 6 фаз реализованы
- Worker API: 6 роутов (concepts, namings, pr-packages, components, assets, users)
- Frontend: 7 views, 7 UI-компонентов, router, pinia store, useApi composable
- D1 schema: 8 таблиц + 9 индексов, seed с users + component types
- Auth: middleware chain (CF Access / dev-mode) + role-based library access
- Asset validation: format detection (PNG magic bytes, SVG XML), aspect ratio, dimensions, file size
- Все API протестированы через curl -- concepts CRUD, namings с линковкой, component types с seed

### 2026-02-19
- Создан проект и документация
- Начата Фаза 1: Инфраструктура + Scaffold
