import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * Guard for `src/styles/app.css` — DP-15258 phase 1.
 *
 * Two things in that file have no other protection in the tree:
 *
 * 1. **`@theme` must never declare a length.** The wizard scales from a single
 *    root font-size (`html.wizard-embed`), so every length in the UI has to be a
 *    `rem` that follows it. A `--spacing-x: 10px` token opts out silently: no
 *    test fails, no type breaks, the layout just stops shrinking with the Admin
 *    panel. Tailwind's own rem-based scales already match the kit, which is why
 *    the block is colour-only.
 *
 * 2. **The embed scale rule is one line and must stay one line.** A second
 *    `font-size` on `html`, or an edited `clamp()`, and the whole embed layout
 *    moves. `grep -rn "wizard-embed" packages/constructor/tests` returned 0
 *    before this file existed.
 *
 * Verified to fail: change any token to a px value, or edit a digit inside the
 * `clamp()`, and this file goes red.
 */

const CSS_PATH = fileURLToPath(new URL('../../../src/styles/app.css', import.meta.url))
const css = readFileSync(CSS_PATH, 'utf8')

/** Comments carry prose about px on purpose — strip them before measuring. */
const stripComments = (input: string): string => input.replace(/\/\*[\s\S]*?\*\//g, '')

const themeBlock = (() => {
  const start = css.indexOf('@theme {')
  expect(start, 'app.css must declare a @theme block').toBeGreaterThan(-1)
  let depth = 0
  for (let i = css.indexOf('{', start); i < css.length; i += 1) {
    if (css[i] === '{') depth += 1
    if (css[i] === '}') {
      depth -= 1
      if (depth === 0) return css.slice(start, i + 1)
    }
  }
  throw new Error('unterminated @theme block')
})()

const themeDeclarations = stripComments(themeBlock)

/** The 13 tokens that predate the kit. Phase 1 is additive: none may vanish. */
const PRE_KIT_TOKENS = [
  '--color-primary',
  '--color-primary-foreground',
  '--color-foreground',
  '--color-muted',
  '--color-muted-foreground',
  '--color-background',
  '--color-card',
  '--color-border',
  '--color-input',
  '--color-success',
  '--color-warning',
  '--color-accent',
  '--color-accent-foreground',
  '--color-error',
] as const

/** Kit vocabulary — Figma 3261:906. Values are the kit's, not a rounding of it. */
const KIT_TOKENS: Record<string, string> = {
  '--color-ink-900': '#1f1f2e',
  '--color-ink-800': '#393947',
  '--color-ink-700': '#6f6f7d',
  '--color-ink-600': '#95959d',
  '--color-ink-500': '#cacace',
  '--color-ink-400': '#dfdfe2',
  '--color-ink-300': '#eaeaeb',
  '--color-ink-200': '#f3f3f5',
  // Added in phase 11: `input/list/item/bg/hovered` on List item `3446:5054`,
  // the same value the kit uses for `comment/bg/default` on Comment `3439:1309`.
  '--color-ink-100': '#f9f9fb',
  '--color-primary-hover': '#2d2d39',
  '--color-green-content': '#218358',
  '--color-green-bg': '#d6f1df',
  '--color-green-border': '#8eceaa',
  '--color-green-surface': '#f4fbf6',
  '--color-amber-content': '#ab6400',
  '--color-amber-bg': '#ffee9c',
  '--color-amber-border': '#e9c162',
  '--color-amber-surface': '#fefbe9',
  '--color-red-content': '#ce2c31',
  '--color-red-bg': '#ffdbdc',
  '--color-red-border': '#f4a9aa',
  '--color-red-surface': '#fff7f7',
  '--color-blue-content': '#3a5bc7',
  '--color-blue-bg': '#e1e9ff',
  '--color-blue-border': '#abbdf9',
  '--color-blue-surface': '#f7f9ff',
  '--color-purple-content': '#8145b5',
  '--color-purple-bg': '#f2e2fc',
}

const declaredValue = (token: string): string | undefined => {
  const match = themeDeclarations.match(new RegExp(`${token}\\s*:\\s*([^;]+);`))
  return match?.[1].trim()
}

describe('@theme carries no lengths', () => {
  it('declares no px value', () => {
    expect(themeDeclarations.match(/\d*\.?\d+px/g)).toBeNull()
  })

  it('declares no em, vw, vh or dvh value', () => {
    expect(themeDeclarations.match(/(?<!r)\d*\.?\d+(em|vw|vh|dvh)\b/g)).toBeNull()
  })

  it('declares no spacing, radius or text scale — Tailwind already matches the kit', () => {
    expect(themeDeclarations).not.toMatch(/--(spacing|radius|text)-/)
    expect(themeDeclarations).not.toMatch(/--spacing\s*:/)
  })

  it('declares nothing but colours and the font stack', () => {
    const names = [...themeDeclarations.matchAll(/(--[a-z0-9-]+)\s*:/g)].map(match => match[1])
    expect(names.length).toBeGreaterThan(0)
    expect(names.filter(name => !name.startsWith('--color-') && name !== '--font-sans')).toEqual([])
  })
})

describe('@theme is additive over the pre-kit tokens', () => {
  it.each(PRE_KIT_TOKENS)('still declares %s', token => {
    expect(declaredValue(token)).toBeDefined()
  })

  it('keeps the accent equal to the kit accent, so no alias is needed', () => {
    expect(declaredValue('--color-primary')).toBe('#030213')
  })
})

describe('kit colour vocabulary', () => {
  it.each(Object.entries(KIT_TOKENS))('declares %s as %s', (token, value) => {
    expect(declaredValue(token)).toBe(value)
  })

  it('writes every colour as a 6-digit hex, so a typo cannot pass as a colour', () => {
    const values = [...themeDeclarations.matchAll(/--color-[a-z0-9-]+\s*:\s*([^;]+);/g)].map(m => m[1].trim())
    expect(values.filter(value => !/^#[0-9a-f]{6}$/.test(value))).toEqual([])
  })

  it('leaves purple border and surface undeclared — the kit does not define them', () => {
    expect(declaredValue('--color-purple-border')).toBeUndefined()
    expect(declaredValue('--color-purple-surface')).toBeUndefined()
  })
})

describe('embed scale rule', () => {
  const withoutComments = stripComments(css)

  it('drives the root font-size from exactly one rule', () => {
    expect(withoutComments.match(/font-size\s*:/g)).toHaveLength(1)
  })

  it('scopes that rule to html.wizard-embed and nothing else', () => {
    expect(withoutComments).toMatch(/html\.wizard-embed\s*\{/)
    expect(withoutComments).not.toMatch(/(^|\})\s*html\s*\{/)
  })

  it('holds the root at a flat 16 — the knob is off on purpose', () => {
    // Was `clamp(11px, min(1.1111vw, 1.7778vh), 18px)`: one knob scaling the
    // whole wizard with the Admin panel. The kit fixes the header 73, the
    // buttons 128×48, the controls and every padding across all four drawn
    // breakpoints and moves only the columns (`5395:118197`), so the root now
    // stands where standalone already had it and the columns are computed in
    // `constants/wizardResponsive.ts`. No `vw`/`vh` may come back here.
    expect(withoutComments).toContain('font-size: 16px;')
    expect(withoutComments).not.toMatch(/font-size:[^;]*\b(vw|vh|dvh)\b/)
  })

  it('counts the concept columns 3 / 4 / 5 at the kit breakpoints', () => {
    // Wizard width = viewport − sidebar: 1440−210 = 1230, 1920−250 = 1670.
    expect(withoutComments).toContain('--wizard-concept-columns: 3;')
    expect(withoutComments).toMatch(/@media \(min-width: 1230px\)[\s\S]*?--wizard-concept-columns: 4;/)
    expect(withoutComments).toMatch(/@media \(min-width: 1670px\)[\s\S]*?--wizard-concept-columns: 5;/)
  })

  it('caps the wizard frame above 1920 the way `5395:119538` does', () => {
    expect(withoutComments).toMatch(/@media \(min-width: 1671px\)/)
    expect(withoutComments).toContain('max-width: 1700px;')
    expect(withoutComments).toContain('max-height: 960px;')
    expect(withoutComments).toContain('padding-block: 48px;')
    // `min-height: 860` is declared on the same kit node and deliberately not
    // reproduced — `5395:119983` draws the frame 715 tall. Divergences row 84.
    expect(withoutComments).not.toContain('min-height: 860px;')
  })

  it('keeps the 560px dual-phone stack contract with BrandPreviewPanel.vue', () => {
    expect(withoutComments).toContain('@media (max-width: 560px)')
    expect(withoutComments).toContain('html.wizard-embed .brand-preview-panel__dual-phones')
    expect(withoutComments).toContain('justify-content: flex-start;')
  })
})
