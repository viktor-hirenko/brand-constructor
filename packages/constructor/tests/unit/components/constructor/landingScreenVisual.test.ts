import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  leftContentPaddingClass,
  leftPanelBgClass,
  rightPaneClass,
} from '@/components/constructor/layout/dualPaneLayoutClasses'

/**
 * Step 0 against the kit — `Brand Creation (step 0)` `5409:35125`, 1440×768.
 * https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=5409-35125&m=dev
 *
 * Component tests are impossible in this package (no `@vue/test-utils`, no
 * `jsdom`, `vitest.config.ts:11` sets `environment: 'node'`), so the screen is
 * read as text — the same idiom as `reviewScreenVisual.test.ts`. The class maps
 * it also touches ARE importable, so those are asserted as values.
 *
 * What it pins is the thing the screen got wrong for its whole life: it was a
 * page of its own — a floating 50/50 card with its own radius and shadow —
 * where the kit draws an ordinary wizard screen. Shown red by restoring, one at
 * a time: the `w-1/2` halves, the `rounded-[14px]` card, the `shadow-[…]`, the
 * "Brand builder" chip, the 48/48 title with its +0.35px letter-spacing, the 20/28
 * description capped at 452, and the bare `size-5` glyphs.
 */

const SRC = fileURLToPath(new URL('../../../../src/', import.meta.url))
const read = (path: string): string => readFileSync(`${SRC}${path}`, 'utf8')

const view = read('views/LandingView.vue')
const cta = read('components/landing/LandingCtaButton.vue')

/** Everything below the doc comments — so a class quoted in prose is not a hit. */
function body(source: string): string {
  return source.replace(/\/\*\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '')
}

const viewBody = body(view)
const ctaBody = body(cta)

describe('step 0 is a wizard screen, not a page of its own', () => {
  it('renders through the shared shell in its own layout mode', () => {
    expect(viewBody).toContain('<ConstructorDualPaneShell')
    expect(viewBody).toContain('layout-mode="landing"')
  })

  it('carries the kit wizard header with BOTH step slots off', () => {
    expect(viewBody).toContain('<UiWizardHeader')
    // `5409:35128` renders the title and the close glyph and nothing else: no
    // step counter, no progress rule. Passing either prop would draw both.
    expect(viewBody).not.toContain('current-step')
    expect(viewBody).not.toContain('total-steps')
  })

  it('keeps none of the floating-card chrome it used to draw', () => {
    expect(viewBody).not.toContain('w-1/2')
    expect(viewBody).not.toContain('rounded-[14px]')
    expect(viewBody).not.toContain('shadow-[')
    expect(viewBody).not.toContain('max-w-[1440px]')
    expect(viewBody).not.toContain('min-h-[740px]')
  })
})

describe('left column — Container 5409:35133, 527 × 344', () => {
  it('stacks text block and feature list at the kit spacing/32', () => {
    expect(viewBody).toContain('landing-view__block flex flex-col gap-8')
  })

  it('title is 40/48 with no letter-spacing of its own', () => {
    expect(viewBody).toContain('text-[2.5rem]')
    expect(viewBody).toContain('leading-[3rem]')
    expect(viewBody).not.toContain('text-[48px]')
    // Letter-spacing is swept tree-wide in `styles/legacyScss.test.ts`, the
    // one file allowed to name the class — Tailwind reads comments too.
  })

  it('has nothing above the title — the kit ships that badge slot empty', () => {
    expect(viewBody).not.toContain('Brand builder')
    expect(viewBody).not.toContain('bg-primary/10')
  })

  it('description is 16/24 ink-700 across the whole column, full stop and all', () => {
    expect(viewBody).toContain('text-base/6 text-ink-700')
    expect(viewBody).not.toContain('max-w-[452px]')
    expect(viewBody).not.toContain('text-xl')
    expect(viewBody).toContain('замовʼте новий.')
  })
})

describe('feature list — 5409:35766, two rows of two', () => {
  it('spaces rows 16 and columns 24', () => {
    expect(viewBody).toContain('grid grid-cols-2 gap-x-6 gap-y-4')
    expect(viewBody).not.toContain('grid-cols-2 gap-6')
  })

  it('puts each glyph in a 32 tile: padding 8, radius 8, bg/alt-3', () => {
    expect(viewBody).toContain('rounded-lg bg-ink-300 p-2')
    // The tile is 32 BECAUSE it is 8 around a 16 glyph — the kit states the
    // padding and the glyph, never the box, so a `size-8` here would be ours.
    expect(viewBody).not.toContain('size-10 rounded-[10px]')
  })

  it('draws the glyphs at 16 in content/primary, not 20 in the accent', () => {
    expect(viewBody.match(/size-4 text-ink-900/g)).toHaveLength(4)
    expect(viewBody).not.toContain('size-5 text-primary')
  })

  it('labels are caption/m/medium 12/16 in content/primary', () => {
    expect(viewBody).toContain('text-xs/4 font-medium text-ink-900')
    // The pre-kit label was `text-base` weight 500 — `text-base/6` is still
    // here, on the description, so the ban has to name the pair.
    expect(viewBody).not.toContain('text-base font-medium')
  })
})

describe('right column — Right panel 5409:35332, one full-bleed picture', () => {
  it('fills the pane edge to edge with no radius and no card', () => {
    expect(viewBody).toContain('absolute inset-0 size-full object-cover')
  })

  it('the pane itself gives up the 32 padding that frames a preview square', () => {
    expect(rightPaneClass('landing')).not.toContain('py-8')
    expect(rightPaneClass('landing')).toContain('relative')
    // Every other screen keeps it — this is a landing-only exemption.
    expect(rightPaneClass('wizard')).toContain('py-8')
    expect(rightPaneClass('review')).toContain('py-8')
  })
})

describe('the two class-map values step 0 changes', () => {
  it('its Step panel is bg/body white, while every other screen is bg/alt-1', () => {
    expect(leftPanelBgClass('landing')).toBe('bg-card')
    expect(leftPanelBgClass('wizard')).toBe('bg-ink-100')
    expect(leftPanelBgClass('review')).toBe('bg-ink-100')
    expect(leftPanelBgClass('edit')).toBe('bg-ink-100')
  })

  it('keeps the pane padding at the kit 32, which is what makes the block 527', () => {
    const landing = leftContentPaddingClass('landing', { reviewShell: false, wizardStep: 1 })
    expect(landing).toContain('px-8')
    expect(landing).toContain('pt-8')
    expect(landing).toContain('pb-8')
    // Too short a window scrolls the block rather than clipping it.
    expect(landing).toContain('overflow-y-auto')
  })
})

describe('the call to action is the kit button, not a recipe of its own', () => {
  it('the plain one is UiButton with the sparkle in the right icon slot', () => {
    expect(viewBody).toContain('<UiButton')
    expect(viewBody).toContain('#icon-right')
  })

  it('the split half takes its whole surface from the kit resolver', () => {
    expect(ctaBody).toContain('resolveUiButtonClasses')
    expect(ctaBody).toContain("variant: 'primary', size: 'L'")
  })

  it('drops the pre-kit landing recipe: radius 14, two-layer shadow, 18/24', () => {
    expect(ctaBody).not.toContain('rounded-[14px]')
    expect(ctaBody).not.toContain('shadow-[0px_10px_15px')
    expect(ctaBody).not.toContain('px-8 py-4')
    expect(ctaBody).not.toContain('text-lg')
  })
})
