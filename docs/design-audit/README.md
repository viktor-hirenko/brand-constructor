# Brand Constructor - Design Audit

## Figma Links

- **Product Owner Flow**: https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=0-1&m=dev
- **Visual Components Extended**: https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=171-4188&m=dev
- **Visual Components bugs (Design Review)**: node `2837-4389` → [`figma-visual-components-bugs.md`](./figma-visual-components-bugs.md)
- **CEO Review bugs (Design Review)**: node `2925-9240` → [`figma-ceo-review-bugs.md`](./figma-ceo-review-bugs.md)

## Screen to Step Mapping

| Step | Screen Name | Figma Node ID | PRD Section |
|------|-------------|---------------|-------------|
| Landing | Бриф на створення бренду | 0:1 (root) | 1.1 Landing Page |
| 1 | Brand Basics | TBD | 2.1 Brand Basics |
| 2 | Mode Selection | TBD | 2.2 Mode |
| 3 | Concept Selection | TBD | 2.3 Concept |
| 4 | External Naming | TBD | 2.4 External Naming |
| 5 | Internal Naming | TBD | 2.5 Internal Naming |
| 6 | Brand Preview | TBD | 2.6 Brand Preview |
| 7 | Marketing Package | TBD | 2.7 Marketing Package |
| 8 | Deliverables | TBD | 2.8 Deliverables |
| 9 | Visual Components | 171:4188 | 2.9 Visual Components |
| 10 | Review & Submit | TBD | 2.10 Review |

## How to Use Figma MCP

При разработке каждого шага конструктора используй Figma MCP API:

```
get_design_context(nodeId: "X:Y", fileKey: "aCe1cUDNaA7Tmcn9Mmvv1w")
```

Это вернёт:
- Скриншот экрана
- Референсный код (React + Tailwind)
- Контекстные подсказки

**Важно**: Адаптируй полученный код под Vue 3 + TypeScript + SCSS.

## Design System Notes

Секция не заполнялась и осталась на уровне «TBD» с начала проекта, при том что
все девять шагов реализованы и в проде. Источник истины по цветам, типографике
и отступам — **код**: `packages/constructor/src/styles/` (Tailwind v4) и
`packages/admin/src/styles/` (SCSS). Заполнять эту секцию задним числом смысла
нет; если понадобится дизайн-токен-слой — это отдельная задача.

Node ID в таблице выше проставлены только для Landing и Visual Components;
остальные помечены `TBD` и так и не были заполнены. Реальные node id, с которыми
велась работа, перечислены в трекерах багов и в постмортеме.

## Files in This Directory

- `README.md` - этот файл
- `screens-product-owner-flow.md` - описание 13 экранов Product Owner Flow
- `screens-visual-components.md` - описание 7 состояний Visual Components
- `figma-discrepancies.md` - расхождения макета с PRD v2
- `figma-visual-components-bugs.md` - progress tracker: 8 багов Visual Components (node 2837-4389), пул закрыт
- `figma-ceo-review-bugs.md` - progress tracker: 11 багов CEO Review (node 2925-9240), 10 закрыто, BRIEF-031 частично
- `uxui-2553-postmortem.md` - разбор отменённой задачи «Переглянути контейнер»: две отклонённые архитектуры и почему

Текущий фокус здесь **не указывается** — он живёт в [`../STATE.md`](../STATE.md),
чтобы не расходиться с реальностью.
