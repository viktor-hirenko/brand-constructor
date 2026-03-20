# ПОЛНЫЙ АУДИТ: Brand Constructor — Документация vs Реализация

> **Источник правды:** `docs/product-spec/v2-original-prd.md` (PRD v2)
> **Дата аудита:** 18 марта 2026

---

## 1. Авторизация и RBAC

| #    | Требование из PRD | Статус | Комментарий |
|------|-------------------|--------|-------------|
| 1.1  | Google SSO авторизация | ✅ Реализовано | routes/auth.ts: POST /api/auth/google, верификация Google ID-токена через oauth2.googleapis.com/tokeninfo |
| 1.2  | JWT-сессии | ✅ Реализовано | 24ч JWT с sub, email, name, role; authMiddleware проверяет на каждом запросе |
| 1.3  | Whitelist пользователей (email в таблице users) | ✅ Реализовано | 403 если email не в users; Admin добавляет пользователей вручную |
| 1.4  | 8 ролей (admin, head_dhc, product_owner, cpo_ceo, strategy_identity, ui_designer, pr_marketing, product_designer) | ✅ Реализовано | shared/constants/roles.ts: все 8 ролей с лейблами |
| 1.5  | RBAC middleware на бэкенде | ✅ Реализовано | requireLibraryAccess(library), requireAdmin, BRAND_APPROVAL_ROLES |
| 1.6  | Роль-матрица: Strategy & Identity → концепты + неймінги | ✅ Реализовано | LIBRARY_WRITE_PERMISSIONS.concepts/external_namings/internal_namings |
| 1.7  | Роль-матрица: UI Designer → компоненты | ✅ Реализовано | component_types/component_variants |
| 1.8  | Роль-матрица: PR & Marketing → PR-пакеты | ✅ Реализовано | pr_packages |
| 1.9  | Роль-матрица: Product Owner → заповнює бриф | ✅ Реализовано | Конструктор доступен авторизованным, бренды привязаны к created_by |
| 1.10 | Роль-матрица: CEO → затверджує бриф | ✅ Реализовано | BRAND_APPROVAL_ROLES: admin, head_dhc, cpo_ceo |
| 1.11 | Frontend: UI скрывает/показывает элементы по роли | ✅ Реализовано | canWriteLibrary() в auth store, isAdmin для UsersView |
| 1.12 | Rate limiting на login | ✅ Реализовано | 5 попыток/IP/60сек → 429 |
| 1.13 | Dev mode (без реальной авторизации) | ✅ Реализовано | ENVIRONMENT=development: X-Dev-User-Email или первый admin |

---

## 2. Admin Panel — Концепты

| #    | Требование из PRD | Статус | Комментарий |
|------|-------------------|--------|-------------|
| 2.1  | CRUD концептов | ✅ Реализовано | API: GET/POST/PUT/DELETE /api/concepts; Frontend: ConceptsView + ConceptDetailView |
| 2.2  | Поля: название, описание | ✅ Реализовано | name (1-200), description (max 2000) |
| 2.3  | Mode (Light/Dark) для концепта | ✅ Реализовано | Поле mode в schema, фильтрация по mode в API |
| 2.4  | Upload визуального ассета (баннеры/візуал) | ✅ Реализовано | concept_visual → concepts.visual_url, ConceptDetailView upload |
| 2.5  | Upload логотипа | ✅ Реализовано | concept_logo → concepts.logo_url |
| 2.6  | Галерея зображень (2-3 картинки) | ❌ Не реализовано | PRD: "Галерея зображень (2-3 картинки)". Код: только 1 visual_url. Нет множественных изображений для концепта |
| 2.7  | Mobile mockup preview | ⚠️ Частично | Поле preview_url в schema есть, но upload в admin panel не реализован |
| 2.8  | Web mockup preview | ⚠️ Частично | Поле preview_url_web в schema (migration 005), concept_preview_web в asset upload, но upload UI в ConceptDetailView не подтверждён |
| 2.9  | Привязка External Names к концепту | ✅ Реализовано | external_namings.concept_id FK, фильтр linked/standalone |
| 2.10 | Статусы: active, archived, used | ✅ Реализовано | ENTITY_STATUSES: active, archived, used, draft |
| 2.11 | Управление доступністю (used_in_brand_id) | ✅ Реализовано | used_in_brand_id колонка, блокировка удаления, табы All/Available/Used |
| 2.12 | Бейдж "Used in {brand_name}" | ✅ Реализовано | ConceptsView: badge при status === 'used' |
| 2.13 | Фильтрация: All / Available / Used | ✅ Реализовано | ConceptsView: табы + API available_for_brand |
| 2.14 | Сортировка | ✅ Реализовано | Newest/Oldest, Name A-Z/Z-A |
| 2.15 | Audit log при создании/обновлении/удалении | ✅ Реализовано | audit_log таблица, запись в routes/concepts.ts |

---

## 3. Admin Panel — Нейминги

| #    | Требование из PRD | Статус | Комментарий |
|------|-------------------|--------|-------------|
| 3.1  | CRUD external namings | ✅ Реализовано | API: GET/POST/PUT/DELETE /api/namings/external |
| 3.2  | CRUD internal namings | ✅ Реализовано | API: GET/POST/PUT/DELETE /api/namings/internal |
| 3.3  | External: назва + домен | ✅ Реализовано | name, domain в schema и формах |
| 3.4  | External: ціна в $ | ✅ Реализовано | price REAL в schema |
| 3.5  | External: статус доступності (Available/Sold) | ✅ Реализовано | availability_status: 'available', 'sold', 'unknown' |
| 3.6  | External: привязка к концепту | ✅ Реализовано | concept_id FK, UI для выбора концепта |
| 3.7  | Internal: назва + tagline | ✅ Реализовано | name, tagline в schema |
| 3.8  | GoDaddy/Namecheap API для автоматической проверки домена | ❌ Не реализовано | PRD: "GoDaddy API / Namecheap API, періодичне оновлення". Код: статус вводится вручную |
| 3.9  | Фильтрация: External/Internal табы | ✅ Реализовано | NamingsView: табы External / Internal |
| 3.10 | Фильтрация: All / Linked / Standalone | ✅ Реализовано | API: filter=all/linked/standalone |
| 3.11 | Бейдж "Used in {brand_name}" | ✅ Реализовано | NamingsView: badge при status === 'used' |
| 3.12 | Табы All / Available / Used | ✅ Реализовано | NamingsView: статусные табы |

---

## 4. Admin Panel — PR-пакеты

| #    | Требование из PRD | Статус | Комментарий |
|------|-------------------|--------|-------------|
| 4.1  | CRUD PR-пакетов | ✅ Реализовано | API: GET/POST/PUT/DELETE /api/pr-packages |
| 4.2  | 6 пакетов (Trust Focus → Total Market Presence) | ✅ Реализовано | Поле number 0-10, seed/UI для создания |
| 4.3  | Поля: number, name, description, teams, requirements, goals, components, timeline, expenses | ✅ Реализовано | Все поля в schema и формах PrPackagesView |
| 4.4  | Команды (PR_TEAMS) с чипами | ✅ Реализовано | PR_TEAMS constant, chips UI в форме |
| 4.5  | Просмотр деталей (модальное окно) | ✅ Реализовано | PrPackagesView: view modal |
| 4.6  | Бейдж "Used in brand" | ⚠️ Частично | Backend: used_in_brand_id колонка + блокировка удаления. Frontend PrPackagesView: нет бейджа и табов Available/Used |

---

## 5. Admin Panel — UI Компоненты

| #    | Требование из PRD | Статус | Комментарий |
|------|-------------------|--------|-------------|
| 5.1  | Типы компонентов: Header, Banners, Thumbnails, Tabbar, Sidebar | ✅ Реализовано | component_types таблица, ComponentsView grid |
| 5.2  | Варианты UI (Type 1, Type 2, Type 3...) | ✅ Реализовано | component_variants таблица, ComponentVariantsView |
| 5.3  | Upload thumbnail для варианта | ✅ Реализовано | component_thumbnail asset type, aspect ratio prefill |
| 5.4  | Счётчик вариантов на типе | ✅ Реализовано | API: variant_count JOIN, ComponentsView показывает |
| 5.5  | Табы All / Available / Used | ✅ Реализовано | ComponentVariantsView: статусные табы |
| 5.6  | Бейдж "Used in {brand_name}" | ✅ Реализовано | ComponentVariantsView: badge при status === 'used' |
| 5.7  | Full images для iPhone mockup | ⚠️ Частично | preview_url поле в schema, но upload в admin UI не подтверждён (только thumbnail) |

---

## 6. Admin Panel — Бренды

| #    | Требование из PRD | Статус | Комментарий |
|------|-------------------|--------|-------------|
| 6.1  | Список брендов | ✅ Реализовано | BrandsView: таблица с именем, статусом, GEO, датой |
| 6.2  | Фильтрация по статусу | ✅ Реализовано | Табы: All, Drafts, Submitted, Approved, Needs Revision, Rejected |
| 6.3  | Удаление черновиков | ✅ Реализовано | Delete только для draft; admin — любой, остальные — свой |
| 6.4  | Клик открывает конструктор | ✅ Реализовано | Row click → new tab /constructor/brand/:id |
| 6.5  | Сортировка | ✅ Реализовано | Client-side: Name, Status, GEO, Launch Date, Updated |

---

## 7. Admin Panel — Пользователи

| #    | Требование из PRD | Статус | Комментарий |
|------|-------------------|--------|-------------|
| 7.1  | CRUD пользователей | ✅ Реализовано | API + UsersView: create/edit/delete modal |
| 7.2  | Назначение ролей | ✅ Реализовано | Role selector + permissions popover |
| 7.3  | Только Admin/Head DHC | ✅ Реализовано | requireAdmin middleware + isAdmin в frontend |
| 7.4  | Запрет удалить себя | ✅ Реализовано | Backend + frontend проверка |
| 7.5  | Email уникальность | ✅ Реализовано | email UNIQUE в schema, 409 при дубликате |

---

## 8. Constructor — Step 1: Brand Basics

| #    | Требование из PRD | Статус | Комментарий |
|------|-------------------|--------|-------------|
| 8.1  | GEO (Географія) — обов'язкове | ✅ Реализовано | GeoMultiSelect с поиском, популярные/другие страны |
| 8.2  | Планована дата запуску — обов'язкове | ✅ Реализовано | DatePicker с minDate |
| 8.3  | Коментар — необов'язкове | ✅ Реализовано | Textarea comment |
| 8.4  | Валідація: без обов'язкових полів не перейти далі | ✅ Реализовано | validateStep(1): geo.length > 0 && launchDate !== '' |
| 8.5  | Поле "linkedProduct" | ⚠️ Частично | В коде есть, но в PRD v2 нет такого поля. Возможно наследие v1 (InHouse/WhiteLabel) |

---

## 9. Constructor — Step 2: Mode

| #    | Требование из PRD | Статус | Комментарий |
|------|-------------------|--------|-------------|
| 9.1  | Dark Mode / Light Mode выбор | ✅ Реализовано | 2 карточки с визуальным примером |
| 9.2  | Вибір Mode фільтрує концепти на наступному кроці | ✅ Реализовано | Step 3 фильтрует GET /api/concepts?mode=selected |
| 9.3  | Валідація: mode обов'язковий | ✅ Реализовано | validateStep(2): mode !== null |

---

## 10. Constructor — Step 3: Concept Selection

| #     | Требование из PRD | Статус | Комментарий |
|-------|-------------------|--------|-------------|
| 10.1  | Показуються тільки концепти обраного Mode | ✅ Реализовано | API фильтр mode=light/dark |
| 10.2  | Можна обрати ЛИШЕ ОДИН концепт | ✅ Реализовано | selectedId: string \| null, single select |
| 10.3  | Картка: Thumbnail, Назва, "Переглянути деталі" | ✅ Реализовано | Карточки с visual_url, name, кнопка деталей |
| 10.4  | Деталі: Назва, Опис | ✅ Реализовано | ConceptDetailOverlay |
| 10.5  | Деталі: Галерея зображень (2-3 картинки) | ❌ Не реализовано | Только 1 visual_url. Нет массива изображений |
| 10.6  | Деталі: Mobile mockup preview | ⚠️ Частично | Поле preview_url в типах, но отображение в overlay не подтверждено |
| 10.7  | Деталі: Web mockup preview | ⚠️ Частично | Поле preview_url_web, но отображение не подтверждено |
| 10.8  | "+ New Concept" — бриф 12 полей | ✅ Реализовано | NewConceptModal: isNewGeo, conceptFeedback, trafficTeamInfo, needsGeoResearch, competitors, keepProductConnection, connectedProducts, namingLanguage, desiredWordsInName, domainZones, domainBudget, namingDeadline, additionalGeoInfo |
| 10.9  | Якщо новий концепт → пропуск Кроку 4 | ✅ Реализовано | shouldSkipStep4 в навигации ConstructorLayout |
| 10.10 | Коментар — необов'язкове | ✅ Реализовано | Textarea |

---

## 11. Constructor — Step 4: External Naming

| #    | Требование из PRD | Статус | Комментарий |
|------|-------------------|--------|-------------|
| 11.1 | Показуються ТІЛЬКИ якщо обрано концепт з бібліотеки | ✅ Реализовано | Step 4 скипается при newConceptBrief |
| 11.2 | Показуються тільки неймінги обраного концепту | ✅ Реализовано | API: concept_id=selectedConceptId |
| 11.3 | Статус доступності: Available/Sold | ✅ Реализовано | availability_status на карточках |
| 11.4 | Ціна в $ | ✅ Реализовано | price на карточках |
| 11.5 | Можна обрати до 3 назв | ✅ Реализовано | selectedIds[], max 3 |
| 11.6 | Якщо >1 назви → коментар обов'язковий | ✅ Реализовано | validateStep(4): if selectedIds.length > 1, comment required |
| 11.7 | "+ Create New External Name" — бриф 11 полів | ✅ Реализовано | NewNamingModal: все поля из PRD |
| 11.8 | Автоматичне оновлення через GoDaddy/Namecheap API | ❌ Не реализовано | Нет интеграции с domain API; статус вводится вручную |

---

## 12. Constructor — Step 5: Internal Naming

| #    | Требование из PRD | Статус | Комментарий |
|------|-------------------|--------|-------------|
| 12.1 | Вибір з бібліотеки — ЛИШЕ ОДНУ назву | ✅ Реализовано | Single select |
| 12.2 | "+ Create New Internal Name" — бриф | ✅ Реализовано | NewInternalNamingModal: textarea feedback |
| 12.3 | Коментар — необов'язкове | ✅ Реализовано | Textarea |
| 12.4 | Валідація: або обрано, або бриф заповнено | ✅ Реализовано | validateStep(5) |

---

## 13. Constructor — Step 6: Brand Preview

| #    | Требование из PRD | Статус | Комментарий |
|------|-------------------|--------|-------------|
| 13.1 | Варіант A: все з бібліотек — показати обрані елементи | ✅ Реализовано | Summary: concept, external namings, internal naming |
| 13.2 | Варіант B: нові — показати брифи | ✅ Реализовано | Brief previews для нових концептів/неймінгів |
| 13.3 | Кнопка "Редагувати" — повернутись на крок | ✅ Реализовано | Кнопки редактирования для steps 3-5 |
| 13.4 | Коментар preview | ✅ Реализовано | previewComment textarea |

---

## 14. Constructor — Step 7: PR Package

| #    | Требование из PRD | Статус | Комментарий |
|------|-------------------|--------|-------------|
| 14.1 | 6 пакетів як картки | ✅ Реализовано | Карточки из /api/pr-packages |
| 14.2 | Назва пакету, строки, список функцій | ✅ Реализовано | name, timeline, components_list |
| 14.3 | "Дивитись детально" → modal | ✅ Реализовано | Detail modal с полным описанием |
| 14.4 | Можна обрати ЛИШЕ ОДИН пакет | ✅ Реализовано | selectedId: string \| null |
| 14.5 | Коментар — необов'язкове | ✅ Реализовано | Textarea |
| 14.6 | Валідація: пакет обов'язковий | ✅ Реализовано | validateStep(7): selectedId !== null |

---

## 15. Constructor — Step 8: Deliverables

| #    | Требование из PRD | Статус | Комментарий |
|------|-------------------|--------|-------------|
| 15.1 | Legal Landing (on/off) | ✅ Реализовано | Toggle |
| 15.2 | Partner Landing (on/off) | ✅ Реализовано | Toggle |
| 15.3 | Дедлайн розробки — обов'язкове якщо щось увімкнено | ✅ Реализовано | validateStep(8): deadline required when any toggle on |
| 15.4 | Коментар — необов'язкове | ✅ Реализовано | Textarea |

---

## 16. Constructor — Step 9: Visual Components

| #    | Требование из PRD | Статус | Комментарий |
|------|-------------------|--------|-------------|
| 16.1 | Ліва панель: список категорій з варіантами | ✅ Реализовано | Accordion per component type |
| 16.2 | Права панель: Live preview на iPhone mockup | ❌ Не реализовано | Нет правой панели с iPhone mockup. Только выбор вариантов |
| 16.3 | Кнопка "На розсуд дизайнерів" | ✅ Реализовано | delegateToDesigners toggle |
| 16.4 | Коментар — необов'язкове | ✅ Реализовано | Textarea |
| 16.5 | MVP: без фільтрації по Mode (Dark/Light) | ✅ Реализовано | Нет фильтрации компонентов по mode (как указано в PRD) |

---

## 17. Constructor — Step 10: Review & Submit

| #    | Требование из PRD | Статус | Комментарий |
|------|-------------------|--------|-------------|
| 17.1 | Summary всіх секцій | ✅ Реализовано | Полный обзор всех шагов |
| 17.2 | Submit бренду | ✅ Реализовано | saveBrand() → POST/PUT /api/brands |
| 17.3 | Save as Draft | ✅ Реализовано | Сохранение в draft статусе |
| 17.4 | Кнопка "Переглянути бриф" — PDF | ⚠️ Частично | Реализовано через window.print() (browser print), не полноценный PDF |

---

## 18. Constructor — Общее

| #    | Требование из PRD | Статус | Комментарий |
|------|-------------------|--------|-------------|
| 18.1 | Progress bar: "Крок X з 10" + percentage | ✅ Реализовано | progressPercent = (currentStep / 10) * 100 |
| 18.2 | Навігація: "Назад" / "Далі" | ✅ Реализовано | Back/Next кнопки в ConstructorLayout |
| 18.3 | "Далі" disabled якщо обов'язкові поля не заповнені | ✅ Реализовано | :disabled="!store.isCurrentStepValid" |
| 18.4 | Автозбереження | ✅ Реализовано | watch(stepData, saveDraftToStorage, { deep: true }) → localStorage |
| 18.5 | Dual-panel interface (Left: Questionnaire, Right: Preview) | ⚠️ Частично | Step 6 (Brand Preview) как отдельный шаг, но не dual-panel layout на каждом шаге |
| 18.6 | Desktop-first, Mobile-friendly | ✅ Реализовано | Responsive design в конструкторе |

---

## 19. CEO Review

| #    | Требование из PRD | Статус | Комментарий |
|------|-------------------|--------|-------------|
| 19.1 | З'являється ТІЛЬКИ якщо все з бібліотек | ✅ Реализовано | showCeoReview = !hasNewBrief && (status === 'submitted' \|\| 'needs_revision') |
| 19.2 | CEO бачить повний бриф | ✅ Реализовано | Step 10 показывает все секции |
| 19.3 | Додати коментарі до кожної секції | ✅ Реализовано | ceoComments: Record\<string, string\>, 7 секций |
| 19.4 | Змінити вибір (обрати інший концепт/неймінг) | ✅ Реализовано | ceoSelections: Record\<string, string\>, CEO library modal |
| 19.5 | Затвердити та відправити в роботу | ✅ Реализовано | PATCH /api/brands/:id/status → approved |
| 19.6 | Надати коментарі та повернути | ✅ Реализовано | PATCH → needs_revision |
| 19.7 | Переглянути бібліотеку | ✅ Реализовано | CEO library modal в Step 10 |

---

## 20. Brand Lifecycle

| #    | Требование из PRD | Статус | Комментарий |
|------|-------------------|--------|-------------|
| 20.1 | draft → submitted | ✅ Реализовано | Только создатель бренда |
| 20.2 | submitted → approved | ✅ Реализовано | Только BRAND_APPROVAL_ROLES |
| 20.3 | submitted → needs_revision | ✅ Реализовано | С комментариями CEO |
| 20.4 | submitted → rejected | ✅ Реализовано | |
| 20.5 | needs_revision → submitted | ✅ Реализовано | Замовник редактирует и отправляет повторно |
| 20.6 | При approved → set used_in_brand_id на всех связанных сущностях | ✅ Реализовано | concepts, external_namings, internal_namings, component_variants, pr_packages |
| 20.7 | При delete draft → clear used_in_brand_id | ✅ Реализовано | Очистка на всех связанных сущностях |

---

## 21. Used in Brand логика

| #    | Требование из PRD | Статус | Комментарий |
|------|-------------------|--------|-------------|
| 21.1 | Концепти: фільтрація в конструкторі | ✅ Реализовано | API: available_for_brand |
| 21.2 | Концепти: бейдж в адмінці | ✅ Реализовано | ConceptsView: "Used in {brand_name}" |
| 21.3 | External Namings: фільтрація + бейдж | ✅ Реализовано | API filter + NamingsView badge |
| 21.4 | Internal Namings: фільтрація + бейдж | ✅ Реализовано | API filter + NamingsView badge |
| 21.5 | Component Variants: фільтрація + бейдж | ✅ Реализовано | API filter + ComponentVariantsView badge |
| 21.6 | PR Packages: used_in_brand_id | ⚠️ Частично | Backend: колонка + блокировка ✓. Frontend PrPackagesView: нет бейджа |
| 21.7 | Блокировка видалення використаних елементів | ✅ Реализовано | HTTP 409 на backend, UI скрывает кнопки |

---

## 22. PDF генерація

| #    | Требование из PRD | Статус | Комментарий |
|------|-------------------|--------|-------------|
| 22.1 | "Переглянути бриф" — PDF версія | ⚠️ Частично | usePrintBrand.ts: генерирует HTML, открывает window.print(). Не полноценный PDF-экспорт, а browser print |
| 22.2 | Унікальний ID брифу (BRIEF-2025-001) | ❌ Не реализовано | Нет форматированного ID. Используется brand.id (UUID) |
| 22.3 | Дата створення в PDF | ✅ Реализовано | В print HTML |
| 22.4 | Всі дані з усіх кроків в PDF | ✅ Реализовано | store.stepData включает все шаги |

---

## 23. Export системы (Étape 3)

| #    | Требование из PRD | Статус | Комментарий |
|------|-------------------|--------|-------------|
| 23.1 | Confluence API — створення structured pages | ❌ Не реализовано | Нет интеграции с Confluence |
| 23.2 | Jira API — створення tasks з assignees | ❌ Не реализовано | Нет интеграции с Jira |
| 23.3 | Slack API — notifications | ❌ Не реализовано | Нет интеграции со Slack |
| 23.4 | Email notifications | ❌ Не реализовано | Нет email-рассылки |
| 23.5 | Фінальний екран з ID, датою, посиланнями | ⚠️ Частично | BrandSuccessView: есть success message, но нет ссылок на Confluence/Jira |

---

## 24. API

| #    | Требование из PRD | Статус | Комментарий |
|------|-------------------|--------|-------------|
| 24.1 | Все CRUD эндпоинты для всех сущностей | ✅ Реализовано | 7 модулей роутов: auth, concepts, namings, pr-packages, components, assets, users, brands |
| 24.2 | Пагинация | ✅ Реализовано | page, per_page на всех list эндпоинтах |
| 24.3 | Фильтрация по статусу | ✅ Реализовано | status query param |
| 24.4 | Валидация через Zod | ✅ Реализовано | Все create/update payloads валидируются |
| 24.5 | Security headers | ✅ Реализовано | X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, CSP |
| 24.6 | CORS middleware | ✅ Реализовано | Configurable origins, все методы |
| 24.7 | Cache headers (no-store для API) | ✅ Реализовано | Кроме /assets/ |

---

## 25. Database

| #     | Требование из PRD | Статус | Комментарий |
|-------|-------------------|--------|-------------|
| 25.1  | users таблица | ✅ Реализовано | id, email, name, role, timestamps |
| 25.2  | concepts таблица | ✅ Реализовано | + mode, visual_url, logo_url, preview_url, preview_url_web, used_in_brand_id |
| 25.3  | external_namings таблица | ✅ Реализовано | + domain, price, availability_status, concept_id, used_in_brand_id |
| 25.4  | internal_namings таблица | ✅ Реализовано | + tagline, used_in_brand_id |
| 25.5  | pr_packages таблица | ✅ Реализовано | + number, teams_involved, requirements, goals, components_list, timeline, expenses, used_in_brand_id |
| 25.6  | component_types таблица | ✅ Реализовано | + sort_order |
| 25.7  | component_variants таблица | ✅ Реализовано | + variant_number, thumbnail_url, preview_url, used_in_brand_id |
| 25.8  | assets таблица | ✅ Реализовано | + entity_type, entity_id, file_url, dimensions, aspect_ratio |
| 25.9  | audit_log таблица | ✅ Реализовано | Логирование для concepts (не для всех сущностей) |
| 25.10 | brands таблица | ✅ Реализовано | 30+ колонок: все шаги + CEO + step_data + current_step |
| 25.11 | Индексы | ✅ Реализовано | 12+ индексов на status, created_by, concept_id, entity |
| 25.12 | 5 миграций | ✅ Реализовано | mode/domain → brands table → deadline → pr_package used_in_brand → concept_preview_web |

---

## 26. Ассеты и файлы

| #    | Требование из PRD | Статус | Комментарий |
|------|-------------------|--------|-------------|
| 26.1 | Cloudflare R2 хранилище | ✅ Реализовано | brand-constructor-assets bucket |
| 26.2 | PNG формат | ✅ Реализовано | Magic bytes проверка |
| 26.3 | SVG формат | ✅ Реализовано | XML-проверка |
| 26.4 | Валідація розмірів файлу (10MB PNG, 2MB SVG) | ✅ Реализовано | MAX_FILE_SIZES constants |
| 26.5 | Мінімальні розміри залежно від типу | ✅ Реализовано | Per-entity-type rules в ASSET_VALIDATION_RULES |
| 26.6 | Опціональна перевірка aspect ratio | ✅ Реализовано | parseAspectRatio(), tolerance ±1%, prefill для компонентів |
| 26.7 | concept_preview_web upload | ⚠️ Частично | Backend поддерживает (concept_preview_web entity_type), migration 005 добавила поле, но UI в admin panel для upload не подтверждён |

---

## СВОДКА

| Категория | Всего | ✅ Реализовано | ⚠️ Частично | ❌ Не реализовано |
|-----------|-------|---------------|-------------|-------------------|
| 1. Авторизация и RBAC | 13 | 13 (100%) | 0 | 0 |
| 2. Admin — Концепты | 15 | 12 (80%) | 2 | 1 |
| 3. Admin — Нейминги | 12 | 11 (92%) | 0 | 1 |
| 4. Admin — PR-пакеты | 6 | 5 (83%) | 1 | 0 |
| 5. Admin — UI Компоненты | 7 | 6 (86%) | 1 | 0 |
| 6. Admin — Бренды | 5 | 5 (100%) | 0 | 0 |
| 7. Admin — Пользователи | 5 | 5 (100%) | 0 | 0 |
| 8. Constructor Step 1 | 5 | 4 (80%) | 1 | 0 |
| 9. Constructor Step 2 | 3 | 3 (100%) | 0 | 0 |
| 10. Constructor Step 3 | 10 | 7 (70%) | 2 | 1 |
| 11. Constructor Step 4 | 8 | 7 (88%) | 0 | 1 |
| 12. Constructor Step 5 | 4 | 4 (100%) | 0 | 0 |
| 13. Constructor Step 6 | 4 | 4 (100%) | 0 | 0 |
| 14. Constructor Step 7 | 6 | 6 (100%) | 0 | 0 |
| 15. Constructor Step 8 | 4 | 4 (100%) | 0 | 0 |
| 16. Constructor Step 9 | 5 | 3 (60%) | 0 | 1 (iPhone mockup) |
| 17. Constructor Step 10 | 4 | 3 (75%) | 1 | 0 |
| 18. Constructor Общее | 6 | 4 (67%) | 2 | 0 |
| 19. CEO Review | 7 | 7 (100%) | 0 | 0 |
| 20. Brand Lifecycle | 7 | 7 (100%) | 0 | 0 |
| 21. Used in Brand | 7 | 6 (86%) | 1 | 0 |
| 22. PDF генерація | 4 | 2 (50%) | 1 | 1 |
| 23. Export системы | 5 | 0 (0%) | 1 | 4 |
| 24. API | 7 | 7 (100%) | 0 | 0 |
| 25. Database | 12 | 12 (100%) | 0 | 0 |
| 26. Ассеты | 7 | 6 (86%) | 1 | 0 |

### ИТОГО

| Метрика | Значение |
|---------|----------|
| Всего требований | 176 |
| ✅ Реализовано | 152 (86.4%) |
| ⚠️ Частично | 14 (8.0%) |
| ❌ Не реализовано | 10 (5.7%) |

---

## ПРИОРИТЕТНЫЕ ЗАДАЧИ ДЛЯ ДОРАБОТКИ

### 🔴 Критические (блокируют основной сценарий)

| # | Задача | Где | Почему критично |
|---|--------|-----|-----------------|
| 1 | iPhone mockup preview на Step 9 | Constructor Step 9 | PRD: "Права панель: Live preview на iPhone 16 Plus mockup (масштаб 75%)". Сейчас только выбор без визуального preview — ключевой UX-фичи конструктора нет |
| 2 | Галерея зображень 2-3 картинки для концепту | Admin + Constructor | PRD: "Галерея зображень (2-3 картинки)". Сейчас 1 visual_url. Нужна поддержка множественных изображений на бэкенде, в admin и конструкторе |
| 3 | Confluence/Jira/Slack export | Worker API | PRD: "Етап 3: Export". Полностью отсутствует. Бриф создаётся, но не доставляется командам автоматически |

### 🟡 Важные (влияют на UX или данные)

| #  | Задача | Где | Комментарий |
|----|--------|-----|-------------|
| 4  | GoDaddy/Namecheap API интеграция | Worker API | PRD: автоматическая проверка доступности домена и цены. Сейчас всё вручную |
| 5  | Mobile + Web preview для концептов в admin | Admin ConceptDetailView | Поля preview_url, preview_url_web есть в schema, но upload UI не полностью реализован |
| 6  | PDF генерация (полноценная) | Constructor | Сейчас window.print(). Нет форматированного ID (BRIEF-2025-001). Нужен реальный PDF export |
| 7  | Бейдж "Used in brand" для PR-пакетов в Admin | PrPackagesView | Backend поддерживает used_in_brand_id, но frontend не показывает бейдж и табы |
| 8  | Dual-panel interface | Constructor Layout | PRD: "Left: Questionnaire, Right: Preview". Сейчас single-column на всех шагах кроме Step 6 |
| 9  | Audit log для всех сущностей | Worker API | Сейчас только для concepts. Нужно расширить на namings, pr-packages, components |
| 10 | Full images для компонентов (iPhone mockup) | Admin + Constructor | preview_url поле есть, но upload/display не полностью реализован |

### 🟢 Желательные (улучшения, не критично)

| #  | Задача | Где | Комментарий |
|----|--------|-----|-------------|
| 11 | Форматированный ID брифа | Constructor | BRIEF-2026-001 вместо UUID |
| 12 | Email notifications | Worker API | PRD упоминает email-оповещения |
| 13 | Поле linkedProduct | Constructor Step 1 | Есть в коде, но отсутствует в PRD v2. Уточнить: нужно ли, или убрать |
| 14 | Фінальний екран: ссылки на Confluence/Jira | BrandSuccessView | Зависит от интеграций (задача #3) |
| 15 | Visual Components Mode Filter | Constructor Step 9 | PRD отмечает как "Post-MVP", но стоит запланировать |
| 16 | Audit Log UI в admin | Frontend | Таблица audit_log заполняется, но UI для просмотра нет |
| 17 | Bulk operations | Admin Panel | Массовое архивирование/удаление — удобно при большом количестве контента |

---

## Ключевые выводы

**Общая картина:** 86.4% требований реализовано — проект в хорошем состоянии. Все 4 пакета (worker, shared, frontend, constructor) работают как единая система. Авторизация, RBAC, brand lifecycle, CEO review, все 10 шагов конструктора — всё на месте.

**Три критических пробела:**
1. **iPhone mockup preview (Step 9)** — нет правой панели с визуальным превью, хотя это одна из ключевых фич конструктора
2. **Галерея изображений для концептов** — PRD требует 2-3 картинки, в коде только 1 visual_url
3. **Export в Confluence/Jira/Slack** — весь Этап 3 (Export) отсутствует; брифы создаются, но не доставляются командам

**Что работает отлично:**
- Авторизация + RBAC (100%)
- Brand Lifecycle (100%)
- CEO Review (100%)
- Database schema (100%)
- API endpoints (100%)
- All 10 constructor steps с валидацией
- Used in Brand логика (бейджи, фильтрация, блокировка удаления)
