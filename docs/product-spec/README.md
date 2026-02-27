# Product Specification — Каталог документів

> Ця папка містить **оригінальну продуктову документацію** з Google Doc, яка є source-of-truth для продуктових вимог Brand Constructor.  
> Документація нашої реалізації (технічна, архітектурна) — у батьківській папці `docs/`.

---

## Зовнішні джерела

- **Google Doc** (всі розділи): [NEW BRAND CONSTRUCTOR](https://docs.google.com/document/d/1HW24G_EI83-suPQfAr77g3n02SNsp3g8iMpnnttYIxw/edit?tab=t.0)
- **FigJam Board** (flow-діаграми): [brand_builder](https://www.figma.com/board/1zmeAfI38nTCbt2hX7UrmM/brand_builder)
  - [General Flow](https://www.figma.com/board/1zmeAfI38nTCbt2hX7UrmM/brand_builder?node-id=2-743)
  - [Concept Flow](https://www.figma.com/board/1zmeAfI38nTCbt2hX7UrmM/brand_builder?node-id=2-773)

---

## Документи

| Файл | Що містить | Версія |
|---|---|---|
| [jira-task.md](jira-task.md) | Оригінальна Jira-задача на розробку адмін-панелі | — |
| [v1-product-concept.md](v1-product-concept.md) | NEW BRAND CONSTRUCTOR v1.0 — Product Concept Document (розділи 1-6) | v1.0 |
| [technical-requirements.md](technical-requirements.md) | Структури даних (Brand, Concept, Naming, Component, MarketingPackage) | v1.0 |
| [success-metrics.md](success-metrics.md) | KPI: efficiency, quality, adoption metrics | v1.0 |
| [pr-packages-detailed.md](pr-packages-detailed.md) | Повна таблиця 6 PR-пакетів (з Excel) + розподіл по брендах (2025-2026) | v2.0 |
| [v2-prd.md](v2-prd.md) | NEW BRAND CONSTRUCTOR v2.0 — PRD з детальним описом кроків 1-10 + Export | v2.0 |
| [v2-technical-requirements.md](v2-technical-requirements.md) | Технічні вимоги v2.0: інтеграції, управління бібліотеками, UI/UX | v2.0 |
| [v2-future-enhancements.md](v2-future-enhancements.md) | Post-MVP покращення: AI, analytics, versioning, mode filter | v2.0 |

### Flow-діаграми

| Файл | Опис |
|---|---|
| [assets/general-flow.png](assets/general-flow.png) | General flow — загальний процес створення бренду |
| [assets/concept-flow.png](assets/concept-flow.png) | Concept flow — дерево концептів, неймінгів та компонентів |

---

## Маппінг: документація → наша реалізація

### Що входить у скоуп Фази 1 (наша задача — адмін-панель)

| Документ / Розділ | Що описує | Реалізовано? |
|---|---|---|
| **jira-task.md** | Задача на адмін-панель бібліотек | **Так** — повністю |
| v1.0: Section 4 (Roles & Permissions) | Ролі та права доступу | **Так** — 8 ролей у BC Admin |
| v1.0: Section 5 (Library Management) | CRUD бібліотек, архівування, історія | **Так** — CRUD + audit_log (наразі лише для концептів) |
| v2.0: "Управління бібліотеками" | Admin Panel для наповнення | **Так** — реалізовано у BC Admin |
| technical-requirements.md | Data models (Concept, Naming, Component) | **Частково** — реалізовано без Brand entity |
| pr-packages-detailed.md | Повні описи 6 PR-пакетів | **Так** — структура реалізована, контент вносять менеджери |

### Що НЕ входить у скоуп Фази 1 (Фаза 2+)

| Документ / Розділ | Що описує | Чому відкладено |
|---|---|---|
| v1.0: Section 6 (PO Flow, Steps 1-9) | 9-кроковий конструктор | Потрібні заповнені бібліотеки + UX-дизайн |
| v2-prd.md (Кроки 1-10 + Export) | Детальний flow конструктора | Потрібні заповнені бібліотеки + UX-дизайн |
| v2-prd.md: CEO Approval | Крок 10: затвердження CEO | Залежить від конструктора |
| v2-prd.md: Export | Confluence, Jira, Slack інтеграції | Потрібні API-доступи + конструктор |
| technical-requirements.md: Brand entity | Сутність Brand у БД | Залежить від UX конструктора |
| v2-technical-requirements.md: Integrations | GoDaddy API, Confluence, Jira, Slack | Потрібні API-доступи |
| v2-technical-requirements.md: UI/UX | Dual-panel layout, progress bar | UX конструктора (Фаза 2) |
| success-metrics.md | KPI продукту | Метрики — не вимога до розробки |
| v2-future-enhancements.md | AI, analytics, versioning | Post-MVP |

### Взаємозв'язок документів

- **v1.0** → концептуальний документ, описує ідею продукту та бібліотеки
- **v2.0** → деталізований PRD, розширює v1.0 конкретними кроками та UI
- **v2.0 supersedes v1.0** для кроків конструктора (6 пакетів замість 4, додані Mode, Brand Preview, Deliverables)
- **Jira-задача** → конкретне завдання на Фазу 1 (адмін-панель бібліотек)
- **Technical Requirements** → data models для всієї системи (включаючи Brand, який буде у Фазі 2)

---

## Наша реалізація (docs/)

| Файл | Опис |
|---|---|
| [../PROJECT-DOCS.md](../PROJECT-DOCS.md) | Технічна документація проєкту (архітектура, API, БД, деплой) |
| [../IMPLEMENTATION-PLAN.md](../IMPLEMENTATION-PLAN.md) | План реалізації з фазами та changelog |
| [../FUTURE-WORK.md](../FUTURE-WORK.md) | Що відкладено і чому |
| [../TASK-REQUIREMENTS.md](../TASK-REQUIREMENTS.md) | Вимоги до задачі (раніше зібрані) |
