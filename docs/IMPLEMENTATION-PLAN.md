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
- [x] Shared types package
- [ ] Scaffold Worker с Hono.js + базовые bindings
- [ ] Scaffold Vue 3 + Vite проект
- [ ] Создать Cloudflare R2 bucket через wrangler
- [ ] Создать Cloudflare D1 database, применить миграцию
- [ ] Настроить Cloudflare Access на dev-домене

**Статус**: 🔄 В процессе

### Фаза 2: Библиотека концептов + ассеты
- [ ] CRUD API для concepts в Worker
- [ ] Upload/delete ассетов через R2 API
- [ ] Валидация ассетов (format, aspect ratio, dimensions)
- [ ] Vue: ConceptsView -- список, создание, редактирование, удаление
- [ ] Vue: FileUpload компонент с preview и валидацией
- [ ] Vue: ConceptCard, ConceptForm компоненты

**Статус**: ⏳ Ожидает

### Фаза 3: Naming библиотеки + связывание
- [ ] CRUD API для external + internal namings
- [ ] Связывание external naming с concept (FK concept_id)
- [ ] Vue: NamingsView -- список с фильтрами
- [ ] Vue: NamingForm с опцией привязки к концепту

**Статус**: ⏳ Ожидает

### Фаза 4: PR-пакеты
- [ ] CRUD API для PR-пакетов
- [ ] Vue: PrPackagesView -- карточки 6 пакетов
- [ ] Vue: PrPackageForm -- форма с полями

**Статус**: ⏳ Ожидает

### Фаза 5: UI-компоненты
- [ ] CRUD API для component_types + component_variants
- [ ] Vue: ComponentsView -- типы с вариантами внутри
- [ ] Vue: ComponentVariantForm -- загрузка thumbnail + preview

**Статус**: ⏳ Ожидает

### Фаза 6: Роли + архивирование + polish
- [ ] Auth middleware в Worker -- проверка роли
- [ ] Vue: UsersView -- управление пользователями и ролями
- [ ] Логика архивирования (used in brand -> archived)
- [ ] History log для каждой сущности
- [ ] Поиск и фильтрация по всем библиотекам

**Статус**: ⏳ Ожидает

---

## Changelog

### 2026-02-19
- Создан проект и документация
- Начата Фаза 1: Инфраструктура + Scaffold
