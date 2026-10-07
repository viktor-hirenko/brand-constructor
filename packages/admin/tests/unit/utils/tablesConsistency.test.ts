import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/*
 * One rule for every table of the admin (owner, 07.10). A table scrolls
 * sideways, so its cells and headers stay on one line at any width instead of
 * stacking; the row's actions are one component with one look and stay in
 * view. Before: «Редагувати» / «Видалити» in words in Users, glyph buttons in
 * Namings, a bare hand-drawn bin in Brands; a role or a price in two or three
 * lines on a narrow screen and in one on a wide one.
 */

const src = (path: string) => readFileSync(resolve(__dirname, '../../../src', path), 'utf8')
const TABLES = ['views/BrandsView.vue', 'views/NamingsView.vue', 'views/UsersView.vue']

describe('tables of the admin', () => {
  it.each(TABLES)('%s: row actions are RowAction, with no words and no hand-drawn glyphs', path => {
    const view = src(path)
    expect(view).toContain('<RowAction')
    const table = view.slice(view.indexOf('<table'), view.indexOf('</table>'))
    expect(table).not.toMatch(/<svg|<BaseButton/)
    expect(table).not.toMatch(/>\s*(Редагувати|Видалити|Історія)\s*</)
  })

  it.each(TABLES)('%s: the actions column stays in view when the table is scrolled', path => {
    const view = src(path)
    expect(view.match(/@include sticky-actions/g)).toHaveLength(2)
  })

  it.each(TABLES)('%s: cells and headers do not wrap', path => {
    const view = src(path)
    expect(view).toMatch(/@include scroll-table-cells|white-space: nowrap;\n    \}\n\n    tr:last-child td/)
  })

  it('RowAction: a Phosphor glyph, the word as the tooltip and the label', () => {
    const rowAction = src('components/ui/RowAction.vue')
    expect(rowAction).toContain(':title="label"')
    expect(rowAction).toContain(':aria-label="label"')
    expect(rowAction).not.toMatch(/<svg|<path/)
  })
})
