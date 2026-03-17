# NEW BRAND CONSTRUCTOR v1.0

## Product Concept Document

- **Version:** 1.0
- **Date:** January 2026
- **Author:** L. Huzenko
- **Status:** Concept Phase

---

## 1. EXECUTIVE SUMMARY

### Overview

New Brand Constructor – це внутрішня адмін-панель у вигляді інтерактивного опитувальника, яка централізує процес створення нових брендів онлайн казино та скорочує час запуску продукту на 40-50%.

### Current Challenge

Команда створює 2-4 нових бренди онлайн казино щороку. Зараз кожна команда (Strategy & Identity, PR & Marketing, Product Design) окремо комунікує з Product Owner для з'ясування вимог, що призводить до:

- Фрагментованої комунікації
- Дублювання питань
- Збільшення часу на координацію
- Ризику втрати інформації

### Solution Value

- **Час:** Скорочення часу брифування з ~2 тижнів до 2-3 днів
- **Ефективність:** Всі команди отримують інформацію одночасно
- **Якість:** Використання готових концептів з бібліотеки замість створення з нуля
- **Прозорість:** Єдине джерело правди для всіх stakeholders

---

## 2. CURRENT STATE ANALYSIS

### Teams & Processes

**Strategy & Identity Team**
Склад: Brand Strategist, Art Director, Brand Designer

Поточний процес:
1. Проводять брифування з Product Owner
2. З'ясовують ГЕО та стильові побажання
3. Створюють концепти та неймінги
4. Презентують варіанти

Проблеми:
- Брифування займає 3-5 зустрічей
- Часто концепти створюються з нуля, навіть якщо є готові рішення
- Немає централізованої бібліотеки минулих концептів

**PR & Marketing Team**

Поточний процес:
1. Визначають маркетинговий пакет для запуску (4 варіанти)
2. Узгоджують чи потрібен запуск соціальних мереж
3. Планують комунікаційну стратегію

Проблеми:
- Узгодження відбувається окремо від інших команд
- Часто питання дублюються

**Product Design Team**

Поточний процес:
1. Визначають чи потрібен лендінг для юристів (отримання ліцензії)
2. З'ясовують необхідність стартового продукту для партнерів
3. Узгоджують візуальний набір компонентів (банери, таббар, хедер, сабнейли, сайдбар, тема)

Проблеми:
- Product Owner не бачить результат до фінальної презентації
- Немає можливості швидко протестувати різні комбінації компонентів

### Approval Chain

Product Owner → CPO → CEO

Проблема: Якщо CEO не затверджує концепт, весь процес повторюється заново.

---

## 3. SOLUTION OVERVIEW

### Concept

New Brand Constructor – це опитувальник з візуальними рішеннями, який Product Owner заповнює ПЕРЕД початком роботи над новим брендом. Система інтегрує бібліотеку готових концептів, неймінгів та візуальних компонентів.

### Key Features

**1. Бібліотека готових рішень**
- Концепти (назва + опис + візуал + лого + неймінги + preview)
- Зовнішні неймінги (окремі або прив'язані до концептів)
- Внутрішні неймінги
- Візуальні варіанти компонентів UI

**2. Live Preview**
Статичний шаблон мобільного екрану, який оновлюється в реальному часі при виборі:
- Концепту (відображаються банери з візуалом концепту)
- Неймінгу (відображається назва на екранах)
- Компонентів (відображається обраний варіант UI)

**3. Centralized Output**
Після заповнення автоматично:
- Створюється Confluence page "New Brand #N" з усіма відповідями та візуалом
- Надсилаються нотифікації в Slack
- (Опціонально) Створюються епіки в Jira для кожної команди

---

## 4. USER ROLES & PERMISSIONS

### Role Matrix

| Role | Can View | Can Fill Constructor | Can Edit Brands | Can Manage Library | Can Admin |
|------|----------|---------------------|-----------------|-------------------|-----------|
| Admin | All + | All | All + | All + | All + |
| Head of DHC | All + | All | All + | All + | - |
| Product Owner | All + | Own brands (before approval) | - | - | - |
| CPO/CEO | All + | All | - | - | - |
| Strategy & Identity | All | - | - | Add/Archive concepts & naming | - |
| UI Designers | All | - | - | Add/Archive components type | - |
| PR & Marketing | All | - | - | Add/Market Packets | - |
| Product Designers | All | - | - | - | - |

---

## 5. LIBRARY MANAGEMENT SYSTEM

### Content Structure

**Концепти**

Повний концепт містить:
- Назва концепту (наприклад, "WonderLand")
- Опис концепту (тематика, настрій)
- Візуальне рішення (банери з іконками стилістичними)
- 2-3 неймінги для концепту
- Preview на шаблоні казино (банери підставлені під концепт)

Частковий концепт:
- Може бути без неймінгів (неймінги додаються окремо пізніше)

**Неймінги**

Зовнішній неймінг:
- Може бути прив'язаний до концепту
- Може бути окремим (не прив'язаний до жодного концепту)

Внутрішній неймінг (для команди):
- Завжди окремий
- Не прив'язується до концептів

**Компоненти UI**

Типи компонентів (MVP):
1. Банери
2. Таббар
3. Хедер
4. Сабнейли (thumbnails)
5. Сайдбар
6. Тема (світла/темна)

Кожен компонент має:
- Кілька варіантів UI (Тип 1, Тип 2, Тип 3...)
- Однакову логіку, різний візуал

---

## 6. PRODUCT OWNER FLOW

### Step-by-Step Constructor

#### Step 1: Brand Basics
Input:
- Radiobutton InHouse/WhiteLabel
- Internal project name (auto-generates "New Brand #N")
- Target GEOs / checkbox – New Geo
- Brief description / goals

Output saved: Brand ID, GEOs, research – y/n, description

#### Step 2: Concept Selection
Interface:
- Grid view бібліотеки концептів
- Кожна картка показує: Preview image, Назва концепту, Короткий опис, Індикатор: повний/частковий концепт

Selection:
- Radio button для вибору одного концепту
- Текстове поле для коментарів (опціонально)

Live Preview Update:
- Банери в мобільному шаблоні справа відображають обраний концепт

Output saved: Concept ID, comments (if any)

#### Step 3: External Naming
Interface:
- Dropdown або grid view неймінгів
- Фільтри: Всі / Прив'язані до концепту / Окремі

Selection:
- Radio button для вибору
- Текстове поле для коментарів

Output saved: External naming ID, comments (if any)

#### Step 4: Internal Naming
Interface:
- Dropdown список внутрішніх неймінгів або можливість ввести новий

Output saved: Internal naming, comments (if any)

#### Step 5: Marketing Package
Interface:
- 4 картки пакетів (InHouse)

Selection:
- Radio button для вибору одного пакету
- Поле для коментарів

Output saved: Package ID, comments (if any)

#### Step 6: Legal Landing
Question: Чи потрібен лендінг для юристів?
Interface: Toggle або checkbox: Yes / No

Output saved: Boolean (true/false)

#### Step 7: Partner Starter Product
Question: Чи потрібен стартовий продукт для партнерів?
Interface: Toggle або checkbox: Yes / No

Output saved: Boolean (true/false)

#### Step 8: Visual Components Assembly
Interface layout:
- Ліва панель (40%): Список компонентів для вибору
- Права панель (60%): Live Preview на мобільному шаблоні

Output saved: Component selections

#### Step 9: Review & Submit
Interface:
- Summary всіх вибраних опцій
- Фінальний preview
- Можливість повернутись до будь-якого кроку

Actions:
- "Save as Draft" – зберегти для редагування пізніше
- "Save for Approval" – лінка на прев'ю для затвердження з CPO/CEO
- "Approval" – інформація зберігається з можливістю завантажити PDF

---

## TECHNICAL REQUIREMENTS

### Data Structure

```typescript
Brand {
  id: string (auto-generated)
  internal_name: string
  external_naming_id: reference
  internal_naming: string
  created_by: user_id
  created_date: timestamp
  status: enum [draft, pending_cpo, pending_ceo, approved, rejected]
  geos: array[string]
  description: text
  concept_id: reference
  concept_comments: text
  external_naming_comments: text
  internal_naming_comments: text
  marketing_package_id: reference
  marketing_comments: text
  legal_landing: boolean
  partner_starter: boolean
  components: {
    banners: component_variant_id
    tabbar: component_variant_id
    header: component_variant_id
    thumbnails: component_variant_id
    sidebar: component_variant_id
    theme: enum [light, dark]
  }
  confluence_page_url: string
  jira_epic_ids: array[string]
}
```

### SUCCESS METRICS

**Efficiency Metrics:**
- Time to create brand brief: від ~2 тижнів >> 2-3 дні (85% reduction)
- Number of meetings: від 4-6 → 1-2 (60% reduction)
- Coordination overhead: single source of truth

**Quality Metrics:**
- Concept reuse rate
- Approval rate
- Time to launch

**Adoption Metrics:**
- Library growth
- User satisfaction
- System usage
