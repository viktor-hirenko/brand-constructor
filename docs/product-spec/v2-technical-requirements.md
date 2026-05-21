# Технічні вимоги (v2.0)

> **Джерело**: NEW BRAND CONSTRUCTOR v2.0 — Google Doc, розділ "Технічні вимоги"

---

## Інтеграції

### Domain Availability Check

- GoDaddy API / Namecheap API
- Періодичне оновлення статусу (щоденно)
- Cache results для performance
- Посилання: https://www.godaddy.com/

### Export Systems

- Оповіщення по пошті (???)
- Confluence API — створення structured pages (???)
- Jira API — створення tasks з assignees (???)
- Slack API — notifications to team channels (???)

---

## Управління бібліотеками

### Admin Panel для наповнення

#### Concepts Library

- Upload зображень (thumbnails, gallery)
- Вказати Mode (Light/Dark)
- Прив'язати External Names
- Управління доступністю
- Виключення використаних концептів, неймінгів

#### External Names Library

- Назва + домен
- Ціна
- Статус (Available/Sold)
- Прив'язка до концепту
- Автоматична перевірка availability

#### Internal Names Library

- Додавання назв
- Управління доступністю

#### Visual Components Library

- Upload компонентів (Header, Banners, etc.)
- Thumbnails для preview
- Full images для iPhone mockup
- Типи (Type 1, 2, 3)

#### PR Packages

- Управління деталями пакетів
- Оновлення опису, цін та строків

---

## UI/UX Requirements

### Layout

**Dual-panel interface:**

- Left: Questionnaire (max-width: 680px, scrollable)
- Right: Preview / Visualization

### Progress Indicator

- Progress bar: "Крок X з 10" + percentage
- Видимий на кожному кроці

### Navigation

- Кнопки "Назад" / "Далі"
- "Далі" disabled якщо обов'язкові поля не заповнені
- Можливість повернутись на попередні кроки

### Responsive

- Desktop-first (primary use case)
- Mobile-friendly для перегляду (не для створення)
