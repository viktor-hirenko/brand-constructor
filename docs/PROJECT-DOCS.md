# Brand Constructor — Project Documentation

## Overview

Brand Constructor is an admin panel for managing brand libraries. It provides CRUD operations for concepts, namings, PR packages, and UI components with role-based access control.

**Live URLs:**
- Frontend: https://brand-constructor.pages.dev
- API: https://brand-constructor-api-production.upstars-marbella.workers.dev

## Architecture

```
brand-constructor/
├── packages/
│   ├── frontend/          # Vue 3 SPA
│   ├── worker/            # Cloudflare Worker API
│   └── shared/            # Shared types and constants
├── docs/                  # Documentation
├── turbo.json             # Turborepo config
├── pnpm-workspace.yaml    # pnpm workspaces
└── package.json           # Root package
```

### Monorepo Structure

The project uses **pnpm workspaces** with **Turborepo** for build orchestration.

## Technologies

| Layer | Technology |
|-------|------------|
| Frontend | Vue 3, TypeScript, Vite, Vue Router, Pinia, SCSS |
| Backend | Cloudflare Workers, Hono.js, TypeScript |
| Database | Cloudflare D1 (SQLite) |
| File Storage | Cloudflare R2 |
| Cache/Sessions | Cloudflare KV |
| Auth | Cloudflare Access (Zero Trust) |
| Validation | Zod |

## Database Schema

9 tables in D1:

| Table | Description |
|-------|-------------|
| `users` | User accounts with roles |
| `concepts` | Visual concepts with logo/preview |
| `external_namings` | External brand names (linked to concepts) |
| `internal_namings` | Internal project names |
| `pr_packages` | PR/Marketing packages |
| `component_types` | UI component categories |
| `component_variants` | UI component variations |
| `assets` | Uploaded files metadata |
| `audit_log` | User action history |

### Key Relationships

- `external_namings.concept_id` → `concepts.id` (many-to-one)
- `component_variants.component_type_id` → `component_types.id` (many-to-one)
- All entities have `created_by` → `users.id`

## API Endpoints

Base URL: `/api`

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check (no auth) |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | List all users |
| GET | `/users/me` | Get current user |
| POST | `/users` | Create user (admin only) |
| PUT | `/users/:id` | Update user (admin only) |
| DELETE | `/users/:id` | Delete user (admin only) |

### Concepts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/concepts` | List concepts |
| GET | `/concepts/:id` | Get concept details |
| POST | `/concepts` | Create concept |
| PUT | `/concepts/:id` | Update concept |
| DELETE | `/concepts/:id` | Delete concept |

### Namings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/namings/external` | List external namings |
| GET | `/namings/internal` | List internal namings |
| POST | `/namings/external` | Create external naming |
| POST | `/namings/internal` | Create internal naming |
| PUT | `/namings/external/:id` | Update external naming |
| PUT | `/namings/internal/:id` | Update internal naming |
| DELETE | `/namings/external/:id` | Delete external naming |
| DELETE | `/namings/internal/:id` | Delete internal naming |

### PR Packages
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/pr-packages` | List packages |
| GET | `/pr-packages/:id` | Get package details |
| POST | `/pr-packages` | Create package |
| PUT | `/pr-packages/:id` | Update package |
| DELETE | `/pr-packages/:id` | Delete package |

### Components
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/components/types` | List component types |
| GET | `/components/types/:id/variants` | List variants for type |
| POST | `/components/types` | Create component type |
| POST | `/components/types/:id/variants` | Create variant |
| PUT | `/components/types/:id` | Update type |
| PUT | `/components/variants/:id` | Update variant |
| DELETE | `/components/types/:id` | Delete type |
| DELETE | `/components/variants/:id` | Delete variant |

### Assets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/assets/:entityType/:entityId/:fileName` | Get asset file (no auth) |
| POST | `/assets/:entityType/:entityId` | Upload asset |
| DELETE | `/assets/:entityType/:entityId/:fileName` | Delete asset |

## Roles & Permissions

8 roles defined:

| Role | Code | Permissions |
|------|------|-------------|
| Admin | `admin` | Full access |
| Head of DHC | `head_dhc` | Full access |
| Product Owner | `product_owner` | Read all |
| CPO / CEO | `cpo_ceo` | Read all |
| Strategy & Identity | `strategy_identity` | Write concepts, namings |
| UI Designer | `ui_designer` | Write components |
| PR & Marketing | `pr_marketing` | Write PR packages |
| Product Designer | `product_designer` | Read all |

### Write Permissions by Entity

```typescript
LIBRARY_WRITE_PERMISSIONS = {
  concepts: ['admin', 'head_dhc', 'strategy_identity'],
  external_namings: ['admin', 'head_dhc', 'strategy_identity'],
  internal_namings: ['admin', 'head_dhc', 'strategy_identity'],
  pr_packages: ['admin', 'head_dhc', 'pr_marketing'],
  component_types: ['admin', 'head_dhc', 'ui_designer'],
  component_variants: ['admin', 'head_dhc', 'ui_designer'],
}
```

## Local Development

### Prerequisites

- Node.js 18+
- pnpm 8+

### Setup

```bash
# Clone and install
cd brand-constructor
pnpm install

# Start development servers
pnpm dev
```

This starts:
- Frontend: http://localhost:5173
- Worker: http://localhost:8787

### Database

Local D1 database is auto-created by Wrangler. To reset:

```bash
cd packages/worker
npx wrangler d1 execute brand-constructor-db --local --file=src/db/schema.sql
npx wrangler d1 execute brand-constructor-db --local --file=src/db/seed.sql
```

## Deployment

### Cloudflare Resources

| Resource | Name | ID |
|----------|------|-----|
| D1 Database | brand-constructor-db | `2aafe66b-27be-4058-9c09-e784efefa404` |
| R2 Bucket | brand-constructor-assets | — |
| KV Namespace | SESSIONS | `c4531fb03f2947418c131880e7ba4a36` |
| Account | upstars_landings | `71bd6a3d109ad42e0973488dafe041b2` |

### Deploy Worker

```bash
cd packages/worker
npx wrangler deploy --env production
```

### Deploy Frontend

```bash
cd packages/frontend
npm run build
npx wrangler pages deploy dist --project-name=brand-constructor
```

## Authentication

### Production (Cloudflare Access)

1. Go to Cloudflare Dashboard → Zero Trust → Access → Applications
2. Create Self-hosted Application for `brand-constructor.pages.dev`
3. Add Policy: Allow emails ending in `@upstars.com`

The Worker reads JWT from `Cf-Access-Jwt-Assertion` header and auto-creates users on first login.

### Development

In development mode (`ENVIRONMENT=development`), the Worker:
1. Checks `X-Dev-User-Email` header
2. Falls back to first admin user in database

## Environment Variables

### Worker (wrangler.toml)

```toml
[vars]
ENVIRONMENT = "development"  # or "production"
CORS_ORIGIN = "http://localhost:5173"  # or production URL
```

### Frontend (.env.production)

```
VITE_API_URL=https://brand-constructor-api-production.upstars-marbella.workers.dev
```

## Frontend Components

### UI Components (packages/frontend/src/components/ui/)

| Component | Description |
|-----------|-------------|
| `BaseButton.vue` | Primary/secondary buttons |
| `BaseInput.vue` | Text/number inputs with labels |
| `BaseTextarea.vue` | Multi-line text input |
| `BaseModal.vue` | Modal dialog |
| `AppHeader.vue` | Top navigation bar |
| `AppSidebar.vue` | Left navigation menu |
| `StatusBadge.vue` | Status indicator (unused) |

### Views (packages/frontend/src/views/)

| View | Route | Description |
|------|-------|-------------|
| `ConceptsView.vue` | `/concepts` | Concept library grid |
| `ConceptDetailView.vue` | `/concepts/:id` | Concept details with assets |
| `NamingsView.vue` | `/namings` | External/Internal naming tabs |
| `PrPackagesView.vue` | `/pr-packages` | PR packages grid |
| `ComponentsView.vue` | `/components` | Component types list |
| `ComponentVariantsView.vue` | `/components/:id` | Component variants grid |
| `UsersView.vue` | `/users` | User management (admin) |

## Shared Package

`@brand-constructor/shared` exports:

- **Types**: `User`, `Concept`, `ExternalNaming`, `InternalNaming`, `PrPackage`, `ComponentType`, `ComponentVariant`, `Asset`, `ApiResponse`, `ApiListResponse`
- **Constants**: `USER_ROLES`, `ROLE_LABELS`, `LIBRARY_WRITE_PERMISSIONS`, `ASSET_CONSTRAINTS`

## Asset Validation

Uploaded assets are validated:

| Constraint | Value |
|------------|-------|
| Max file size | 5 MB |
| Allowed types | PNG, SVG |
| Min dimensions | 100×100 px |
| Aspect ratio tolerance | ±5% |

Aspect ratios by entity:
- Concept visual: 16:9
- Concept logo: 1:1
- Concept preview: 4:3
- Component thumbnail: 1:1
- Component preview: 16:9

## Scripts

### Root

```bash
pnpm dev          # Start all dev servers
pnpm build        # Build all packages
pnpm lint         # Lint all packages
pnpm typecheck    # Type check all packages
```

### Worker

```bash
pnpm dev          # Start local worker
pnpm deploy       # Deploy to Cloudflare
```

### Frontend

```bash
pnpm dev          # Start Vite dev server
pnpm build        # Build for production
pnpm preview      # Preview production build
```

## Future Work

- [ ] Brand Constructor wizard (9-step flow)
- [ ] Brand entity with linked library items
- [ ] Integration with external systems
- [ ] Audit log viewer in admin
- [ ] Bulk operations
