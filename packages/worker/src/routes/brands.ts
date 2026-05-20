import { Hono } from 'hono'
import type { Env, Variables } from '../types'
import crud from './brands.crud'
import ceo from './brands.ceo'
import status from './brands.status'

/**
 * Top-level brand router. Routes are split across role/responsibility-aligned
 * sub-routers (F-09):
 *   - `brands.crud.ts`     — list, get-by-id, create, wizard-update, delete
 *   - `brands.ceo.ts`      — CEO override paths (selections + comment resolve)
 *   - `brands.status.ts`   — `PATCH /:id/status` (the F-04 zone — approve
 *                            batch + Slack dispatch)
 *
 * Pure utilities, types, schemas, and the notification-payload assembler live
 * in `utils/brands.ts` and `routes/brands.notifications.ts`.
 *
 * `index.ts` keeps mounting this router at `/api/brands`, so external URLs
 * are unchanged.
 */
const brands = new Hono<{ Bindings: Env; Variables: Variables }>()

brands.route('/', crud)
brands.route('/', ceo)
brands.route('/', status)

export default brands
