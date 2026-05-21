# Brand Constructor - Design Audit

## Figma Links

- **Product Owner Flow**: https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=0-1&m=dev
- **Visual Components Extended**: https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=171-4188&m=dev

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

### Colors (из макета)
- Primary: TBD (определить при разработке Step 1)
- Background: TBD
- Text: TBD

### Typography
- Font family: TBD
- Heading sizes: TBD
- Body text: TBD

### Spacing
- Grid: TBD
- Gaps: TBD

## Files in This Directory

- `README.md` - этот файл
- `screens-product-owner-flow.md` - описание 13 экранов Product Owner Flow
- `screens-visual-components.md` - описание 7 состояний Visual Components
- `figma-discrepancies.md` - расхождения макета с PRD v2
