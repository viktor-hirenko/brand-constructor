import { Hono } from 'hono'
import type { Env, Variables } from '../types'
import crud from './brands.crud'
import ceo from './brands.ceo'
import events from './brands.events'
import status from './brands.status'

/**
 * Top-level brand router. Routes are split across role/responsibility-aligned
 * sub-routers:
 *   - `brands.crud.ts`     — list, get-by-id, create, wizard-update, delete
 *   - `brands.ceo.ts`      — CEO override paths (selections + comment resolve)
 *   - `brands.status.ts`   — `PATCH /:id/status` (atomic approve batch +
 *                            Slack dispatch; see file header)
 *
 * Pure utilities, types, schemas, and the notification-payload assembler live
 * in `utils/brands.ts` and `routes/brands.notifications.ts`.
 */
const brands = new Hono<{ Bindings: Env; Variables: Variables }>()

brands.route('/', events)
brands.route('/', crud)
brands.route('/', ceo)
brands.route('/', status)

export default brands
