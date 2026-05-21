# Brand Constructor

Внутрішній інструмент для створення брендів. Monorepo з двома SPA-додатками
і Cloudflare Worker API.

| Додаток | URL (prod) | Призначення |
|---|---|---|
| **BC Admin** | https://brand-constructor.pages.dev | Керування бібліотеками контенту (concepts, namings, PR packages, UI components, users) |
| **Brand Constructor app** | https://brand-constructor-app.pages.dev | Wizard для Product Owner — створення бренду на основі бібліотек, з flow CEO approve / send-back |
| **API** | https://brand-constructor-api-production.upstars-landings.workers.dev | Cloudflare Worker (Hono.js) + D1 + R2 + cron + Slack |

---

## Architecture at a glance

```
brand-constructor/
├── packages/
│   ├── admin/         # Vue 3 SPA — BC Admin
│   ├── constructor/   # Vue 3 SPA — Wizard
│   ├── worker/        # Cloudflare Worker — REST API
│   └── shared/        # TS types & constants
├── docs/              # Tech docs, product spec, security, design audit
├── scripts/           # Operational scripts
└── package.json       # pnpm + turbo workspace
```

Стек: Vue 3 + TypeScript + Vite (admin SCSS, constructor Tailwind+SCSS),
Pinia, Cloudflare Workers + Hono.js, Cloudflare D1 (SQLite), Cloudflare R2,
Google OAuth + own JWT у HttpOnly cookie + CSRF.

---

## Quick start

Вимоги: Node.js >= 20, pnpm >= 9.

```bash
git clone git@github.com:viktor-hirenko/brand-constructor.git
cd brand-constructor
pnpm install
pnpm dev          # admin :5173 + constructor :5174 + worker :8787
```

Для локального login flow потрібно покласти секрети у `packages/worker/.dev.vars`
і `VITE_*` у `.env`-файли admin / constructor — див. розділ
[Secrets & env](./docs/PROJECT-DOCS.md#14-secrets--environment-variables) у
повній документації.

### Окремі команди

```bash
pnpm dev:admin               # лише BC Admin
pnpm dev:constructor         # лише Brand Constructor app
pnpm dev:worker              # лише Cloudflare Worker

pnpm build                   # білд усіх пакетів через turbo
pnpm lint
pnpm type-check
```

### Deploy

```bash
pnpm deploy:worker:production   # API → Cloudflare Workers
pnpm build:admin && cd packages/admin && npx wrangler pages deploy dist \
    --project-name brand-constructor
pnpm deploy:constructor         # Brand Constructor app → Pages
pnpm deploy:all                 # все одразу
```

> Worker завжди деплоїться з `--env production`. Без цього прапора деплой
> впаде — це навмисний захист від випадкового публічного деплою на
> `*.workers.dev`. Деталі — [PROJECT-DOCS § 13](./docs/PROJECT-DOCS.md#13-deployment).

---

## Documentation

| Документ | Для кого |
|---|---|
| **[docs/PROJECT-DOCS.md](./docs/PROJECT-DOCS.md)** | Розробники, тімлід, security review — архітектура, API, БД, auth, deploy, security |
| **[docs/security/CLOUDFLARE-HARDENING.md](./docs/security/CLOUDFLARE-HARDENING.md)** | Security review — P0/P1/P2 Cloudflare-side checklist |
| **[docs/product-spec/](./docs/product-spec/)** | Продукт — PRD v1/v2, бізнес-вимоги, success metrics (source-of-truth, не оновлюється) |
| **[docs/design-audit/](./docs/design-audit/)** | Дизайн — Figma screen mapping |
| **[docs/TASK-REQUIREMENTS.md](./docs/TASK-REQUIREMENTS.md)** | Контекст — оригінальна Jira-задача |
| **[docs/IMPLEMENTATION-PLAN.md](./docs/IMPLEMENTATION-PLAN.md)** | Історія — snapshot плану на 2026-02-24 |
| **[docs/FUTURE-WORK.md](./docs/FUTURE-WORK.md)** | Roadmap (частково застарілий — Phase 2 виконана) |

---

## Security

- Auth: Google OAuth → HttpOnly cookie + CSRF HMAC (без Bearer/localStorage).
- Env isolation: production binds лише під `[env.production]` у `wrangler.toml`.
- Rate limit: 5 запитів / 60 с на IP для `/api/auth/google`.
- CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy на всіх response.
- CORS allowlist через `CORS_ORIGINS`.
- Усі реальні secrets — у Cloudflare encrypted secrets, ніколи в коді / git.

Повний security overview — у [PROJECT-DOCS § 15](./docs/PROJECT-DOCS.md#15-security-notes).

---

## License

Internal proprietary — Upstars / DHC. Не для публічного використання чи
розповсюдження.
