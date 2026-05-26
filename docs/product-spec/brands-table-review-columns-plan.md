# План: колонки Review / Waiting в таблице Brands (admin)

Статус: **реализовано** (admin: Review + Waiting колонки, SLA-тоны, сортировка).

---

## Решение по layout: **две колонки**

| Колонка | Содержимое | Почему отдельно |
|--------|------------|-----------------|
| **Review** | Этап согласования одной строкой: кто ждёт / что произошло | Смысл стабилен по ширине (~120–180px) |
| **Waiting** | Возраст в статусе + короткая дата | Длина сильно плавает (1h … 12d); сортировка CEO по этой колонке |

Одна колонка с двумя строками хуже для **сортировки** и сканирования очереди: «Review» и «сколько ждёт» — разные задачи. В двух колонках обе строки всегда **одна линия** (`nowrap` + ellipsis + `title`).

Альтернатива (не берём в v1): одна ячейка 2 строки — проще вёрстка, но нельзя сортировать по времени ожидания без отдельного поля в API.

---

## Макет таблицы (целевой)

```
| Name | Status | Author | Created | Review              | Waiting        | GEO | Launch | Actions |
|------|--------|--------|---------|---------------------|----------------|-----|--------|---------|
| #3   | Approved | …    | 26.05   | Approved · V.H.     | 26.05          | AT  | …      | History |
| #2   | Needs rev. | …  | 25.05   | Sent back · CEO     | 1d · 26.05     | AU  | …      | History |
| #1   | Submitted | …   | 25.05   | Waiting CEO         | 3d · 25.05     | AU  | …      | History |
```

Tooltip на **Waiting** (и при необходимости Review): полная цепочка из History / snapshot.

---

## Ответы на продуктовые вопросы (из кода + разумные default для post-MVP)

### 1. SLA по этапам (дней на ответ)

**Ответ для реализации:** SLA **не задан** бизнесом → в v1 только **информативные** пороги, без блокировок.

| Дней в статусе | Визуал (колонка Waiting) |
|----------------|---------------------------|
| 0–2 | обычный текст |
| 3–6 | `waiting--warn` (amber) |
| 7+ | `waiting--late` (red) |

Пороги — константы в `packages/admin/src/constants/brand-review-sla.ts`, легко поменять когда бизнес скажет цифры.

### 2. Приоритет очереди CEO

**Ответ из кода:** CEO (`cpo_ceo`) и `admin` видят **все** бренды (`canListAllBrands` в [`brands.crud.ts`](../../packages/worker/src/routes/brands.crud.ts)).

**Default сортировка для таба Submitted / All:** по **Waiting** descending (дольше всего ждут — сверху). Опционально вторичный ключ: `submit_count` desc (resubmit выше).

### 3. «Ждёт» для Needs revision

**Ответ:** ждёт **PO** (правки и повторный submit). CEO уже сделал send back.

- **Review:** `Sent back · {CEO short name}`
- **Waiting:** возраст с `needs_revision_at` (или fallback, см. п.7)
- Если `submitted_at > needs_revision_at` → бейдж `Resubmitted` в Review (PO уже отправил снова, CEO снова в очереди — уточнить статус: обычно снова `submitted`)

### 4. Визуальные alerts

**Реализация v1 (без Slack):**

```typescript
function waitingTone(days: number): 'normal' | 'warn' | 'late' {
  if (days >= 7) return 'late'
  if (days >= 3) return 'warn'
  return 'normal'
}
```

CSS-модификатор на ячейке **Waiting** только (`color` + optional `font-weight`), не на всей строке — чтобы не шуметь.

v2: фильтр «Waiting > 3 days», счётчик в табе Submitted.

### 5. Кто видит таблицу и какие строки

**Навигация:** пункт **Brands** в sidebar **без** `adminOnly` — видят все роли admin SPA ([`AppSidebar.vue`](../../packages/admin/src/components/ui/AppSidebar.vue)).

**Данные в списке** ([`brands.crud.ts`](../../packages/worker/src/routes/brands.crud.ts)):

| Роль | Список |
|------|--------|
| `admin`, `cpo_ceo` | все бренды |
| `product_owner` | только `created_by = self` |
| остальные (`head_dhc`, `strategy_identity`, `ui_designer`, `pr_marketing`, `product_designer`) | только `status = approved` |

**Вывод для UX:** колонки Review/Waiting полезны в первую очередь **CEO и admin**; PO видит те же колонки, но только свои брифы; у «библиотечных» ролей таблица почти всегда Approved — Waiting почти всегда дата approve.

Constructor — отдельное приложение; таблица Brands только admin.

### 6. Resubmit в таблице или только в History?

**Рекомендация (post-MVP без вопроса бизнесу):**

- В **Review**, компактно: `Waiting CEO` + бейдж `· #2` если `submit_count > 1` (не отдельная колонка).
- Детали resubmit — в **History** и tooltip.

Так CEO видит повторную подачу без второй строки текста.

### 7. Backfill — что это и нужно ли

**Простыми словами:** старые бренды созданы **до** workflow. В БД у них `submitted_at`, `needs_revision_at` часто **NULL**, хотя статус уже `submitted` / `needs_revision`. Поэтому UI показывает только «Sent back» без даты.

**Backfill** = одноразово заполнить пустые даты из `updated_at` или первого события в `brand_workflow_events`.

| Вариант | Действие |
|---------|----------|
| A (минимум) | В UI: если snapshot null → Waiting = `~{format(updated_at)}` + tooltip «approximate, pre-workflow» |
| B (лучше) | SQL-скрипт миграции 012 только для prod: выставить `submitted_at`/`needs_revision_at` по эвристике |
| C | Ничего не делать — только новые действия после деплоя заполнят даты |

**Рекомендация для v1:** **A** (fallback в UI) + опционально **B** если на проде останутся 2–3 тестовых бренда и нужна красивая демо.

---

## Источники данных (уже есть в API)

`BrandListItem` ([`brand.ts`](../../packages/shared/src/types/brand.ts)):

- `submittedAt`, `submitCount`, `submittedByName`
- `needsRevisionAt`, `needsRevisionByName`
- `approvedAt`, `approvedByName`
- `updatedAt`, `createdAt`, `status`

Новых полей worker для v1 **не требуется**, кроме опционального `waitingSince` computed на фронте.

---

## Логика `waitingSince` (фронт)

```text
draft        → null (Waiting: —)
submitted    → submittedAt ?? updatedAt (approx)
needs_revision → needsRevisionAt ?? updatedAt (approx)
approved     → approvedAt ?? updatedAt (approx)
```

`approx` → суффикс `~` или иконка в tooltip.

Формат **Waiting:**

- `formatRelative(since)` + ` · ` + `formatDate(since)`  
  Пример: `3d · 25.05.2026`

Формат **Review:** см. [`useBrandReviewLabel.ts`](../../packages/admin/src/composables/useBrandReviewLabel.ts) — расширить до `{ review, waiting, waitingTone, title }`.

---

## Этапы реализации

### Этап 1 — Composable и константы

- [`useBrandReviewLabel.ts`](../../packages/admin/src/composables/useBrandReviewLabel.ts) → переименовать/расширить в `useBrandReviewDisplay.ts`
- `getBrandReviewDisplay(brand)` → `{ reviewLine, waitingLine, waitingTone, tooltip, isApproxDate }`
- [`brand-review-sla.ts`](../../packages/admin/src/constants/brand-review-sla.ts) — пороги 3 / 7 дней
- Утилита `formatRelativeUk(date)` — `Intl.RelativeTimeFormat` или простой diff days/hours

### Этап 2 — Таблица BrandsView

- Заменить колонку `Review` на `Review` + `Waiting`
- Стили: `brands-view__waiting--warn`, `--late`
- `title` на ячейках Waiting
- Сортировка: в [`useTableSort`](../../packages/admin/src/composables/useTableSort.ts) добавить ключ `waitingSince` (computed на клиенте из ISO-даты)

### Этап 3 — Legacy fallback

- Если `isApproxDate` — tooltip: «Date estimated from last update; open History for audit»

### Этап 4 — (опционально) Backfill SQL

- `012_backfill_brand_snapshot_dates.sql` — только если нужно для демо на существующих 3 брендах

### Этап 5 — Тесты

- Unit-тесты composable: 4 статуса, resubmit badge, approx fallback, tone 3d/7d

**Не в scope:** Slack, аналитика, изменение RBAC, polling (отдельно, флагом).

---

## Polling (уже сделано)

Реализовано в `6c3ba43`: `useListPolling`, silent refresh, все library-страницы кроме Users. Интервал 30 с. Тестировать необязательно для перехода к колонкам Review/Waiting.

---

## Критерии приёмки

1. Submitted: Review = `Waiting CEO`, Waiting = `Nd · DD.MM.YYYY` (или approx).
2. Needs revision: Review = `Sent back · CEO`, Waiting от `needs_revision_at`.
3. Approved: Review = `Approved · name`, Waiting = дата approve.
4. CEO может отсортировать по Waiting (старые сверху).
5. Строка Waiting окрашивается amber/red по порогам 3/7 дней.
6. Tooltip даёт полный контекст без обрезания в ячейке.
7. Resubmit: бейдж `#2` в Review при `submit_count > 1`.
