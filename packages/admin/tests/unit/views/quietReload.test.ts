import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/*
 * After delete, save or upload the list refreshes quietly — owner, 29.09: the
 * whole table blinked into «Loading...» after every delete. A plain reload
 * flips `loading`, and every view swaps the list for «Loading...» while it is
 * true. «Loading...» stays for the first open, tab switches and «Retry».
 * A delete also drops the row in place, right when the server confirms.
 */

const RELOAD = /\b(loadBrands|refreshConcepts|refreshList|reloadPackages|fetchVariants|fetchUsers|reloadConcept|reloadTypes)\(([^)]*)\)/g

const VIEWS: ReadonlyArray<readonly [file: string, dropsRow: string | null]> = [
  ['BrandsView', 'brands.value = brands.value.filter'],
  ['ConceptsView', 'concepts.value = concepts.value.filter'],
  ['ConceptDetailView', null],
  ['NamingsView', 'Namings.value = '],
  ['PrPackagesView', 'packages.value = packages.value.filter'],
  ['ComponentsView', null],
  ['ComponentVariantsView', 'variants.value = variants.value.filter'],
  ['UsersView', 'users.value = users.value.filter'],
]

/** Bodies of the script's functions that write to the server. */
function writers(source: string): string[] {
  const script = source.slice(source.indexOf('<script'), source.indexOf('</script>'))
  const bodies: string[] = []
  const re = /\nasync function \w+\([^)]*\)[^{]*\{/g
  let m: RegExpExecArray | null
  while ((m = re.exec(script))) {
    const start = m.index + m[0].length
    const end = script.indexOf('\n}\n', start)
    const body = script.slice(start, end)
    if (/await api(Delete|Post|Put|Upload)\b/.test(body)) bodies.push(body)
  }
  return bodies
}

describe.each(VIEWS)('%s', (view, dropsRow) => {
  const source = readFileSync(resolve(__dirname, `../../../src/views/${view}.vue`), 'utf8')

  it('refreshes quietly after every delete, save and upload', () => {
    const calls = writers(source).flatMap(body => [...body.matchAll(RELOAD)])
    expect(calls.length).toBeGreaterThan(0)
    for (const call of calls) expect(call[0]).toMatch(/\{ silent: true \}/)
  })

  if (dropsRow) {
    it('drops the deleted row in place', () => {
      const del = writers(source).find(body => /await apiDelete\b/.test(body))!
      expect(del).toContain(dropsRow)
    })
  }
})
