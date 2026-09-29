import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/*
 * DP-15450 — the Admin top bar below 1280.
 *
 * `packages/admin` has no `@vue/test-utils` and `vitest.config.ts` runs in
 * `node`, so a component cannot be mounted here. What CAN silently regress is
 * the markup, and that is what this guard reads: the same idiom the wizard
 * package uses for its screen guards.
 *
 * Two things are pinned, and the second matters as much as the first: the
 * "← Brands" button is gone, and the burger is NOT. Below `$bp-sidebar` the
 * Admin sidebar is off-canvas and the burger in this bar is the only control
 * that opens it — a cleanup that took both would leave the menu unreachable.
 */

const SOURCE = readFileSync(
  resolve(__dirname, '../../../src/components/ui/AppHeader.vue'),
  'utf8',
)

/** The template only — the file's comments are allowed to name what was removed. */
const TEMPLATE = SOURCE.slice(SOURCE.indexOf('<template>'), SOURCE.indexOf('</template>') + 11)

describe('AppHeader — the Admin bar that survives below 1280', () => {
  it('carries no "Brands" button any more', () => {
    expect(TEMPLATE).not.toContain('Brands')
    expect(TEMPLATE).not.toContain('&larr;')
    expect(TEMPLATE).not.toContain('←')
  })

  it('carries no class or handler left over from that button', () => {
    expect(SOURCE).not.toContain('app-header__back')
    expect(SOURCE).not.toContain('goToBrands')
    expect(SOURCE).not.toContain('useRouter')
  })

  it('still carries the burger and still raises `toggle-sidebar`', () => {
    expect(TEMPLATE).toContain('app-header__burger')
    expect(TEMPLATE).toContain("emit('toggle-sidebar')")
    expect(SOURCE).toContain("'toggle-sidebar': []")
  })

  it('still carries the burger rule that shows it only on a collapsed sidebar', () => {
    expect(SOURCE).toContain('@include sidebar-collapsed')
  })

  it('still names the page', () => {
    expect(TEMPLATE).toContain('app-header__title')
    expect(TEMPLATE).toContain('{{ pageTitle }}')
  })
})
