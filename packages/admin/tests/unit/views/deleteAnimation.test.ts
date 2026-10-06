import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/*
 * A deleted row or card fades out (~0.2 s); in card grids the rest slide into
 * its place (owner, 29.09). Only the item a person deletes animates: quiet
 * polling, sorting and tab switches must not, so the TransitionGroup name is
 * `list-delete` only inside `playDelete`. Reduced motion turns it off.
 */

const SRC = resolve(__dirname, '../../../src')
const read = (file: string): string => readFileSync(resolve(SRC, file), 'utf8')

const VIEWS: ReadonlyArray<readonly [view: string, cards: boolean]> = [
  ['BrandsView', false],
  ['NamingsView', false],
  ['UsersView', false],
  ['ConceptsView', true],
  ['PrPackagesView', true],
  ['ComponentVariantsView', true],
]

describe.each(VIEWS)('%s', (view, cards) => {
  const source = read(`views/${view}.vue`)

  it('draws the list through a TransitionGroup named by the delete switch', () => {
    const tag = cards ? 'tag="div"' : 'tag="tbody"'
    expect(source).toMatch(new RegExp(`<TransitionGroup[^>]*${tag}[^>]*:name="transitionName"`))
  })

  it('drops the deleted item inside playDelete', () => {
    expect(source).toMatch(/playDelete\(\(\) => \{\s*(if \(type === 'external'\) )?\w+\.value = \w+\.value\.filter/)
  })

  if (cards) {
    it('pins the leaving card so the others can slide', () => {
      expect(source).toContain('@before-leave="pinLeavingCard"')
      expect(source).toContain('list-delete-cards')
      expect(source).toMatch(/&__grid \{\s*position: relative;/)
    })
  }
})

describe('delete animation styles', () => {
  const css = read('styles/global.scss')
  const composable = read('composables/useDeleteAnimation.ts')

  it('animates only under the list-delete name', () => {
    expect(composable).toMatch(/active\.value \? 'list-delete' : 'list-still'/)
    expect(css).not.toMatch(/\.list-still/)
  })

  it('wins over the rows’ and cards’ own hover transitions', () => {
    expect(css).toMatch(/\.list-delete-leave-active \{\s*transition:[^;]*200ms ease !important;/)
    expect(css).toMatch(/\.list-delete-move \{\s*transition: transform 250ms ease !important;/)
  })

  it('is off for reduced motion', () => {
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{\s*\.list-delete-leave-active,\s*\.list-delete-move \{\s*transition: none !important;/
    )
  })
})

describe('what arrives after a delete does not animate', () => {
  // Owner, 29.09: «удаляешь в одном месте, а оно двигается в другом». The
  // quiet refresh landed inside the animation window and every row it shifted
  // slid — 11 rows of another author for one deleted brand.
  const composable = read('composables/useDeleteAnimation.ts')

  it('runs the refresh only after the switch is off', () => {
    expect(composable).toMatch(/setTimeout\(\(\) => \{\s*active\.value = false\s*refresh\?\.\(\)\s*\}, ms\)/)
  })

  it.each(VIEWS.map(([view]) => view))('%s hands its refresh to playDelete', view => {
    expect(read(`views/${view}.vue`)).toMatch(/\}, \(\) => \w+\(\{ silent: true \}\)\)/)
  })
})

describe('lists without a page switcher load everything', () => {
  // A delete pulled a hidden brand in from past the page limit (50 of 53 were
  // shown), and 18 of 38 external namings were never shown at all (limit 20).
  it('Brands asks for 500', () => {
    expect(read('views/BrandsView.vue')).toContain('perPage.value = 500')
  })
  it('Namings ask for the namings maximum, 500; Concepts for the server maximum, 100', () => {
    expect(read('views/NamingsView.vue')).toMatch(/status: statusFilter\.value, per_page: '500'/)
    expect(read('views/ConceptsView.vue')).toMatch(/status: statusFilter\.value, per_page: '100'/)
  })
})
