import type { BrandListItem } from '@brand-constructor/shared'

/**
 * Which brand a brief is, for the Brands table: «New Brand #122» is the
 * brief's number, the concept and the Internal Naming say what it is about
 * (owner, 07.10). A brief has one of each, so a cell holds one value. External
 * Namings are up to three candidates before the legal check — they stay on the
 * brief's page and are only searched here.
 */

/** A name from the library, an order the team has not answered yet, or nothing yet. */
export type BrandPick = { kind: 'picked'; name: string } | { kind: 'ordered' } | { kind: 'none' }

type PickedBrand = Pick<
  BrandListItem,
  'conceptName' | 'internalNamingName' | 'externalNamingNames' | 'newConceptBrief' | 'stepData' | 'internalName'
>

function pick(name: string | null | undefined, ordered: boolean): BrandPick {
  if (name) return { kind: 'picked', name }
  return ordered ? { kind: 'ordered' } : { kind: 'none' }
}

/** The concept of the brief: picked from the library, or ordered and not made yet. */
export function conceptPick(brand: PickedBrand): BrandPick {
  return pick(brand.conceptName, brand.newConceptBrief != null)
}

/** The Internal Naming of the brief; an order for one is the author's wish typed on its step. */
export function internalNamingPick(brand: PickedBrand): BrandPick {
  const wish = brand.stepData?.internalNaming?.newNamingFeedback
  return pick(brand.internalNamingName, typeof wish === 'string' && wish.trim() !== '')
}

/** What a cell says: the name, «замовлено» while the order stands, a dash otherwise. */
export function pickText(p: BrandPick): string {
  if (p.kind === 'picked') return p.name
  return p.kind === 'ordered' ? 'замовлено' : '—'
}

/** Every name a person may know the brief by — the search looks through all of them. */
export function brandSearchValues(brand: PickedBrand): (string | null | undefined)[] {
  return [brand.internalName, brand.conceptName, brand.internalNamingName, ...(brand.externalNamingNames ?? [])]
}

/** The column sorts by the name; orders and empty cells go after the names. */
export function pickSortValue(p: BrandPick): string {
  return p.kind === 'picked' ? p.name.toLowerCase() : '￿'
}
