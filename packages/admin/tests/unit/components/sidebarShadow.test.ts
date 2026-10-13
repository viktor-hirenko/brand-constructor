import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/*
 * Below 1280 the menu is off-canvas: moved out beyond the left edge of the
 * screen and brought back by the burger. It carried its shadow at all times,
 * and a shadow 24 wide reaches past the edge it is cast from — so on every
 * screen of the Admin on a phone and a tablet a grey strip lay along the left
 * edge, with the menu nowhere to be seen. Found 12.10 on the owner's own
 * screens while the wizard's preview was being fixed; he asked what the strip
 * was, and it was taken away.
 *
 * The shadow belongs to the OPEN menu. It fades with the slide, so the menu
 * does not lose it at the first frame of closing.
 */

const SOURCE = readFileSync(resolve(__dirname, '../../../src/components/ui/AppSidebar.vue'), 'utf8')
const STYLE = SOURCE.slice(SOURCE.indexOf('<style'))

/** The body of the first `@include sidebar-collapsed { … }` after `from`. */
function collapsedBlock(from: number): string {
  const start = STYLE.indexOf('@include sidebar-collapsed {', from)
  return STYLE.slice(start, STYLE.indexOf('}', start))
}

describe('the collapsed menu casts no shadow on the screen', () => {
  it('moved off the screen, it has none', () => {
    const closed = collapsedBlock(STYLE.indexOf('.sidebar {'))
    expect(closed).toContain('transform: translateX(-100%);')
    expect(closed).not.toMatch(/box-shadow:\s*\d/)
  })

  it('open, it has the one it always had', () => {
    const open = collapsedBlock(STYLE.indexOf('&--open {'))
    expect(open).toContain('transform: translateX(0);')
    expect(open).toContain('box-shadow: 4px 0 24px rgba(0, 0, 0, 0.3);')
  })

  it('and loses it with the slide, not before it', () => {
    const closed = collapsedBlock(STYLE.indexOf('.sidebar {'))
    expect(closed).toMatch(/transition:\s*transform \$transition-slow,\s*box-shadow \$transition-slow;/)
  })
})
