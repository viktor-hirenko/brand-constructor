import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/*
 * Brands and Namings: only the rows scroll; the top of the page and the column
 * titles stay in view (owner, 29.09). The table box is the scroller — a sticky
 * header only sticks inside its nearest scrolling box, and that box already
 * scrolls sideways. Phones (< $bp-md) keep the whole page scrolling.
 */

const style = (view: string): string => {
  const src = readFileSync(resolve(__dirname, `../../../src/views/${view}.vue`), 'utf8')
  return src.slice(src.indexOf('<style'))
}

describe.each([
  ['BrandsView', 'brands-view'],
  ['NamingsView', 'namings-view'],
])('%s', (view, block) => {
  const css = style(view)

  it('fills the content height and lets only the table shrink', () => {
    expect(css).toMatch(
      new RegExp(
        `\\.${block} \\{\\s*(//.*\\s*)*@include mq\\(\\$bp-md\\) \\{\\s*display: flex;\\s*flex-direction: column;\\s*height: 100%;[\\s\\S]*?> :not\\(\\.${block}__table-wrap\\) \\{\\s*flex-shrink: 0;`
      )
    )
  })

  it('scrolls the rows inside the table box', () => {
    expect(css).toMatch(
      /&__table-wrap \{[\s\S]*?@include mq\(\$bp-md\) \{\s*flex: 0 1 auto;\s*min-height: 240px;\s*overflow: auto;/
    )
  })

  it('pins the column titles on an opaque background', () => {
    expect(css).toMatch(
      /background-color: \$color-bg;\s*@include mq\(\$bp-md\) \{\s*position: sticky;\s*top: 0;\s*z-index: 1;/
    )
  })
})
