import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { phosphorPaths } from '@brand-constructor/shared'

/*
 * DP-15859, step 3 — the Admin's own glyphs outside the menu.
 *
 * The Admin has no mock-up (owner, 29.09: «Экранов адмикни в фигме пока нет»),
 * so only the places whose PURPOSE matches a row of the designer's mapping
 * table `5658:39246` were converted; everything else in the inventory of
 * `docs/design-audit/dp-15859-icons.md` is left as it was on purpose.
 *
 * Pinned per place: the identifier used at the call site is imported from
 * exactly that file of `@phosphor-icons/core` (folder = weight), it is used
 * the expected number of times, and the character or drawing it replaced is
 * gone from the markup. Swapping an import, pointing one at another weight,
 * or putting the old `&times;` / `&larr;` / `▦` / stroked chevron back turns
 * this file red.
 */

const SRC = resolve(__dirname, '../../../src')
const requireFromPackage = createRequire(resolve(__dirname, '../../../package.json'))

interface Place {
  /** The row of `5658:39246` this place follows, verbatim. */
  readonly useCase: string
  readonly file: string
  readonly id: string
  readonly packageFile: string
  /** How many `<PhosphorIcon :svg="id"` tags the template carries. */
  readonly uses: number
  /** What stood there before; must be gone from the template. */
  readonly gone: readonly string[]
}

const PLACES: readonly Place[] = [
  {
    useCase: 'Close',
    file: 'components/ui/BaseModal.vue',
    id: 'close',
    packageFile: 'regular/x.svg',
    uses: 1,
    gone: ['&times;', '×'],
  },
  {
    useCase: 'Close',
    file: 'views/UsersView.vue',
    id: 'close',
    packageFile: 'regular/x.svg',
    uses: 1,
    gone: ['✕'],
  },
  {
    useCase: 'Chevron down',
    file: 'components/brands/BrandWorkflowHistoryModal.vue',
    id: 'caretDown',
    packageFile: 'regular/caret-down.svg',
    uses: 4,
    gone: ['m6 9 6 6 6-6', '<svg'],
  },
  {
    useCase: 'Placeholder',
    file: 'views/ComponentVariantsView.vue',
    id: 'imageSquare',
    packageFile: 'regular/image-square.svg',
    uses: 1,
    gone: ['<svg'],
  },
  {
    useCase: 'Arrow left',
    file: 'views/ComponentVariantsView.vue',
    id: 'arrowLeft',
    packageFile: 'regular/arrow-left.svg',
    uses: 1,
    gone: ['&larr;', '←'],
  },
  {
    useCase: 'Arrow left',
    file: 'views/ConceptDetailView.vue',
    id: 'arrowLeft',
    packageFile: 'regular/arrow-left.svg',
    uses: 1,
    gone: ['&larr;', '←'],
  },
  {
    useCase: 'UI Components',
    file: 'views/ComponentsView.vue',
    id: 'squaresFour',
    packageFile: 'regular/squares-four.svg',
    uses: 1,
    gone: ['&#9638;', '▦'],
  },
]

const read = (file: string): string => readFileSync(resolve(SRC, file), 'utf8')

/** The template only, comments dropped — prose may name what was replaced. */
const templateOf = (source: string): string =>
  source
    .slice(source.indexOf('<template>'), source.lastIndexOf('</template>'))
    .replace(/<!--[\s\S]*?-->/g, '')

describe.each(PLACES)('$useCase in $file', ({ file, id, packageFile, uses, gone }) => {
  const source = read(file)
  const template = templateOf(source)

  it(`imports ${id} from @phosphor-icons/core/${packageFile}`, () => {
    const m = new RegExp(
      `^import\\s+${id}\\s+from\\s+'@phosphor-icons/core/([\\w/-]+\\.svg)\\?raw'`,
      'm',
    ).exec(source)
    expect(m, `no package import named ${id}`).not.toBeNull()
    expect(m![1]).toBe(packageFile)
    const svg = readFileSync(requireFromPackage.resolve(`@phosphor-icons/core/${packageFile}`), 'utf8')
    expect(phosphorPaths(svg).length).toBeGreaterThan(0)
  })

  it(`draws it ${uses} time(s) through PhosphorIcon`, () => {
    const tags = template.match(new RegExp(`<PhosphorIcon\\s+:svg="${id}"`, 'g')) ?? []
    expect(tags).toHaveLength(uses)
  })

  it('no longer carries what stood there before', () => {
    for (const old of gone) expect(template).not.toContain(old)
  })
})
