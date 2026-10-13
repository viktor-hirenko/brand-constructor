/**
 * The archive of the component library — DP-15450, visual components 5.
 *
 * The designer: «У варіантах Sidebar, Banners і Thumbnails досі доступні старі
 * кольорові варіанти компонентів. → Прибрати застарілі варіанти та залишити
 * тільки актуальні компоненти.»
 *
 * «Видалити» erases the row, and a brief that had picked the variant is left
 * with its id for a name and a hole in the phone preview. A variant in the
 * archive keeps its row: the wizard's step 7 leaves `archived` out of the
 * choice, while the review and the preview read every status — so it is gone
 * from the choice and stays in the briefs that have it.
 *
 * Pure functions, because `packages/admin` tests run in `node` and cannot mount
 * the view.
 */

import { ENTITY_STATUSES } from '@brand-constructor/shared'

interface WithStatus {
  status: string
}

export type VariantStatusFilter = 'all' | 'active' | 'archived'

/** The tabs of the page; each `status` is a filter `GET …/variants?status=` knows. */
export const VARIANT_STATUS_TABS: { status: VariantStatusFilter; label: string }[] = [
  { status: 'all', label: 'Усі' },
  { status: 'active', label: 'Не використані' },
  { status: 'archived', label: 'В архіві' },
]

export function isArchivedVariant(variant: WithStatus): boolean {
  return variant.status === ENTITY_STATUSES.ARCHIVED
}

export interface VariantArchiveAction {
  label: string
  /** The status the button sets. */
  status: typeof ENTITY_STATUSES.ARCHIVED | typeof ENTITY_STATUSES.ACTIVE
}

/**
 * What the archive button of a card does, or `null` where it has no business:
 * a variant a brand has taken (`used`) is out of the choice already, and
 * sending it «back» to `active` would hand it out a second time.
 */
export function variantArchiveAction(variant: WithStatus): VariantArchiveAction | null {
  if (variant.status === ENTITY_STATUSES.ACTIVE) return { label: 'В архів', status: ENTITY_STATUSES.ARCHIVED }
  if (variant.status === ENTITY_STATUSES.ARCHIVED) {
    return { label: 'Повернути з архіву', status: ENTITY_STATUSES.ACTIVE }
  }
  return null
}
