import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/*
 * The browser's own `alert()` is gone from the Admin, and stays gone.
 *
 * Eight places used it for errors — one with a "Payload sent: {…}" debug line
 * — and a colleague read it as the site being broken. They now raise the
 * Admin's own window through `useErrorDialog().showError(err, action)`, drawn
 * once by `ErrorDialog.vue` in `App.vue`. A ninth place, deleting a PR
 * package, had no error handling at all and now uses it too.
 *
 * Also pinned: a concept used by an approved brand offers no way to change it,
 * and says why up front. PR packages are deliberately NOT locked on screen:
 * they are a reusable service option, not a one-brand asset (owner, 29.09).
 */

const SRC = resolve(__dirname, '../../../src')
const read = (file: string): string => readFileSync(resolve(SRC, file), 'utf8')

const withoutComments = (source: string): string =>
  source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')

const templateOf = (source: string): string =>
  withoutComments(source.slice(source.indexOf('<template>'), source.lastIndexOf('</template>')))

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return walk(path)
    return /\.(vue|ts)$/.test(name) ? [path] : []
  })
}

describe('no browser dialogs in the Admin', () => {
  it('calls none of alert(), confirm() or prompt() anywhere in src', () => {
    const offenders = walk(SRC).filter((path) =>
      /(^|[^\w.])(window\.)?(alert|confirm|prompt)\(/m.test(
        withoutComments(readFileSync(path, 'utf8')),
      ),
    )
    expect(offenders).toEqual([])
  })

  it('never shows the request body to a person', () => {
    const offenders = walk(SRC).filter((path) =>
      withoutComments(readFileSync(path, 'utf8')).includes('Payload sent'),
    )
    expect(offenders).toEqual([])
  })

  it('draws the error window once, in App.vue', () => {
    expect(templateOf(read('App.vue'))).toMatch(/<ErrorDialog\s*\/>/)
  })
})

const PLACES: ReadonlyArray<readonly [file: string, action: string, count: number]> = [
  ['views/BrandsView.vue', 'delete', 1],
  ['views/UsersView.vue', 'save', 1],
  ['views/UsersView.vue', 'delete', 1],
  ['views/ConceptDetailView.vue', 'save', 1],
  ['views/ConceptDetailView.vue', 'upload', 1],
  ['views/ConceptDetailView.vue', 'delete', 1],
  ['views/ComponentVariantsView.vue', 'upload', 1],
  ['views/PrPackagesView.vue', 'save', 1],
  ['views/PrPackagesView.vue', 'delete', 1],
]

describe.each(PLACES)('%s reports a failed %s', (file, action, count) => {
  it(`through showError(err, '${action}')`, () => {
    const calls = withoutComments(read(file)).match(
      new RegExp(`showError\\(err, '${action}'\\)`, 'g'),
    )
    expect(calls ?? []).toHaveLength(count)
  })
})

describe('a concept used by an approved brand', () => {
  const source = read('views/ConceptDetailView.vue')
  const template = templateOf(source)

  it('offers no edit, upload or delete control — all three slots ask canEdit', () => {
    expect(template.match(/v-if="canEdit"/g) ?? []).toHaveLength(3)
    expect(template).not.toContain('v-if="canWrite"')
    expect(source).toMatch(/const canEdit = computed\(\(\) => canWrite\.value && !isUsedInBrand\.value\)/)
  })

  it('says so up front, naming images too', () => {
    expect(template).toMatch(/<div v-if="isUsedInBrand" class="concept-detail__locked"/)
    expect(template).toContain('картинки змінити не можна')
  })
})
