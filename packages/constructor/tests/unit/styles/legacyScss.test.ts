import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Guard for the SCSS removal — DP-15258 phase 19.
 *
 * Until this phase the wizard carried two styling systems: Tailwind for the
 * whole product, and a legacy SCSS trio (`_variables`, `_mixins`, `global`)
 * whose only consumer was `views/LoginView.vue`. The page moved to Tailwind
 * and the trio was deleted.
 *
 * Three things here have no other protection in the tree:
 *
 * 1. **`global.scss` must never come back.** It opened with
 *    `html { font-size: 16px }`. There must be exactly ONE `font-size` rule on
 *    `html` in the whole tree, and its value is deliberate: a second rule from
 *    anywhere would silently win or lose by source order, and nothing would
 *    fail — not the build, not the types, not a single other test. The file
 *    sat unimported in the tree for months looking like a stylesheet somebody
 *    forgot to wire up.
 *
 *    **The value changed with the responsive work, on purpose.** It used to be
 *    `clamp(11px, min(1.1111vw, 1.7778vh), 18px)` — one knob scaling the whole
 *    wizard with the Admin panel. The kit fixes the header, the buttons, the
 *    controls and every padding across all four breakpoints and moves only the
 *    columns (`5395:118197`), so the root now stands at a flat 16 and the
 *    columns are computed in `constants/wizardResponsive.ts`. The guard is
 *    still the same guard: one rule, one value, changed only on purpose.
 *
 * 2. **No SCSS anywhere under `src`.** One `lang="scss"` block brings the
 *    preprocessor config back with it, and with it the landmine above.
 *
 * 3. **The pre-kit blue is gone.** `#2563eb` was `$color-primary` of the
 *    scaffold this project started from; the kit's accent is `#030213`. It was
 *    the login page's accent and existed nowhere else — divergences row 23.
 *
 * Verified to fail, not assumed to: re-creating `src/styles/global.scss` with
 * its original first rule turns test 1 and test 2 red; putting `#2563eb` back
 * into `LoginView.vue` turns test 3 red.
 */

const SRC = fileURLToPath(new URL('../../../src', import.meta.url))
const CONSTRUCTOR = fileURLToPath(new URL('../../..', import.meta.url))

/** Every file under `src`, recursively, as absolute paths. */
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

const sourceFiles = walk(SRC)

/**
 * Comments in this repo talk *about* the removed files by name — the note in
 * `vite.config.ts` is the main one. Strip comments before matching so prose
 * cannot fail the guard and, more importantly, cannot mask a real occurrence.
 */
const stripComments = (input: string): string =>
  input.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/<!--[\s\S]*?-->/g, '')

describe('legacy SCSS removal (DP-15258 phase 19)', () => {
  it('leaves no .scss file under src/', () => {
    const scss = sourceFiles.filter((path) => path.endsWith('.scss'))
    expect(scss, 'the SCSS trio was deleted in phase 19 and must not return').toEqual([])
  })

  it('leaves app.css as the only stylesheet under src/styles', () => {
    const stylesheets = readdirSync(join(SRC, 'styles')).sort()
    expect(stylesheets).toEqual(['app.css'])
  })

  it('has no <style lang="scss"> block and no SCSS import in any source file', () => {
    const offenders = sourceFiles
      .filter((path) => path.endsWith('.vue') || path.endsWith('.ts'))
      .filter((path) => {
        const body = stripComments(readFileSync(path, 'utf8'))
        return /lang=["']s[ac]ss["']/.test(body) || /['"][^'"]*\.s[ac]ss['"]/.test(body)
      })
    expect(offenders).toEqual([])
  })

  it('keeps the SCSS preprocessor out of both Vite configs', () => {
    for (const config of ['vite.config.ts', '.storybook/main.ts']) {
      const body = stripComments(readFileSync(join(CONSTRUCTOR, config), 'utf8'))
      expect(body, `${config} must not configure a SCSS preprocessor`).not.toMatch(
        /preprocessorOptions/,
      )
    }
  })

  it('sets the root font-size in exactly one place — the embed clamp', () => {
    const rules = sourceFiles
      .filter((path) => path.endsWith('.css') || path.endsWith('.vue'))
      .flatMap((path) => {
        const body = stripComments(readFileSync(path, 'utf8'))
        return [...body.matchAll(/html[^{}]*\{[^}]*font-size\s*:([^;}]+)/g)].map((match) =>
          match[1].trim(),
        )
      })
    expect(rules).toEqual(['16px'])
  })

  it('has no #2563eb left in the tree', () => {
    const offenders = sourceFiles.filter((path) =>
      /#2563eb/i.test(stripComments(readFileSync(path, 'utf8'))),
    )
    expect(offenders).toEqual([])
  })
})
