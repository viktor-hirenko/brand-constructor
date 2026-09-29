import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * Guard for WHICH glyph stands in WHICH slot — DP-15258, the icons pass.
 *
 * `kitIconSet.test.ts` pins the other half: that `StarIcon.vue` draws Phosphor
 * `Star`. Both halves are needed, and the missing one is why this file exists.
 *
 * The designer's mapping table (`5658:39246`) has six columns —
 * `Use case · Current · → · Phosphor · Phosphor name · Weight` — and the first
 * one names a **place**, not a file. Phase 23 read it as "our file name → glyph
 * name", converted the 27 files whose names happened to line up, and declared
 * the other 21 pairless. Nine pairs were assigned and missed that way, because
 * the table names them by the package, the field or the landing row they sit
 * in. A file-level guard cannot see that: every file in the tree can hold the
 * right glyph while half the screens still show the wrong picture.
 *
 * So this file pins the call sites. Each row below is a row of the designer's
 * table, quoted verbatim in `useCase`, plus the place it turned out to mean.
 *
 * Verified to fail: put `ZapIcon` back on PR package 1, swap the landing's
 * `TextAaIcon` for `PaletteIcon`, or return `SparklesFilledIcon` to the review
 * screen — each one turns this file red.
 */

const SRC = fileURLToPath(new URL('../../../../src/', import.meta.url))

const read = (path: string): string => readFileSync(`${SRC}${path}`, 'utf8')

/**
 * The prose in these components explains what a slot used to carry, so the
 * record of the change survives. Measure the markup, not the comments, or
 * "carried `ZapIcon`" reads as a live call.
 */
const withoutComments = (source: string): string =>
  source.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '')

interface Placement {
  /** The `Use case` cell of `5658:39246`, verbatim. */
  readonly useCase: string
  readonly file: string
  /** Finds the icon tag actually rendered in that slot. Must capture the tag. */
  readonly at: RegExp
  readonly expect: string
}

const PR_PACKAGE_SLOT = (n: number): RegExp =>
  new RegExp(`<(\\w+Icon)\\s+v-(?:else-)?if="pkg\\.number === ${n}"`)

const LANDING_SLOT = (key: string): RegExp =>
  new RegExp(`<(\\w+Icon)\\s+v-(?:else-)?if="feature\\.icon === '${key}'"`)

/**
 * The six PR package levels on step 5. The table assigns these by PACKAGE NAME,
 * and names map to `number` 1..6 in the `pr_packages` table of the production
 * data, which is the field the wizard receives.
 */
const PLACEMENTS: readonly Placement[] = [
  {
    useCase: 'Trust Focus',
    file: 'views/wizard/MarketingPackageView.vue',
    at: PR_PACKAGE_SLOT(1),
    expect: 'ShieldCheckIcon',
  },
  {
    useCase: 'Social Trust',
    file: 'views/wizard/MarketingPackageView.vue',
    at: PR_PACKAGE_SLOT(2),
    expect: 'UsersThreeIcon',
  },
  {
    useCase: 'Full Reputation',
    file: 'views/wizard/MarketingPackageView.vue',
    at: PR_PACKAGE_SLOT(3),
    expect: 'StarIcon',
  },
  {
    useCase: 'Media Reputation',
    file: 'views/wizard/MarketingPackageView.vue',
    at: PR_PACKAGE_SLOT(4),
    expect: 'NewspaperClippingIcon',
  },
  {
    useCase: 'Brand Excellence',
    file: 'views/wizard/MarketingPackageView.vue',
    at: PR_PACKAGE_SLOT(5),
    expect: 'TrophyIcon',
  },
  {
    useCase: 'Total Market Presence',
    file: 'views/wizard/MarketingPackageView.vue',
    at: PR_PACKAGE_SLOT(6),
    expect: 'GlobeHemisphereWestIcon',
  },

  // The four feature rows of the wizard landing. All four labels are use cases
  // in the table; only "Маркетінговий розвіток" matched before this pass.
  {
    useCase: 'Креативні концепти',
    file: 'views/LandingView.vue',
    at: LANDING_SLOT('swatches'),
    expect: 'SwatchesIcon',
  },
  {
    useCase: 'Неймінги',
    file: 'views/LandingView.vue',
    at: LANDING_SLOT('text-aa'),
    expect: 'TextAaIcon',
  },
  {
    useCase: 'UI рішення',
    file: 'views/LandingView.vue',
    at: LANDING_SLOT('figma'),
    expect: 'FigmaLogoIcon',
  },
  {
    useCase: 'Маркетінговий розвіток',
    file: 'views/LandingView.vue',
    at: LANDING_SLOT('trending'),
    expect: 'TrendingUpIcon',
  },

  // The sidebar preview toggle on step 7. Two rows of the table — and both the
  // WHERE and the WHICH changed with DP-15450 `visual components 4`.
  //
  // Where: it used to float over the phone in the right column. Her screen
  // `5382:33712` puts it in the «Sidebar» accordion row on the left, in the
  // kit's own `Visibility Icon` slot, so the anchors read the step's view.
  //
  // Which: the glyph names the STATE, not the action. `5382:33712` draws the
  // layer over the phone beside a plain eye; `5382:64114` draws the phone
  // without it beside a crossed one. The floating button had it the other way
  // round — crossed while the sidebar was visible — so this pair is inverted
  // on purpose and must not be "fixed" back.
  {
    useCase: 'Переглянути / Показати',
    file: 'views/wizard/VisualComponentsView.vue',
    at: /<(\w+Icon)\s+v-if="isSidebarPreviewVisible"/,
    expect: 'EyeIcon',
  },
  {
    useCase: 'Приховати',
    file: 'views/wizard/VisualComponentsView.vue',
    at: /<(\w+Icon)\s+v-else\s+:class="UI_ACCORDION_ICON_SIZE_CLASS"\s*\/>/,
    expect: 'EyeSlashIcon',
  },
]

describe('kit icons by use case (DP-15258 icons pass)', () => {
  describe.each(PLACEMENTS)('$useCase', ({ file, at, expect: expected }) => {
    it(`is drawn by ${expected}`, () => {
      const match = at.exec(withoutComments(read(file)))
      expect(match, `slot not found in ${file} — the anchor moved`).not.toBeNull()
      expect(match?.[1]).toBe(expected)
    })
  })

  it('"Звʼязок з іншим продуктом" is a Link in both places it appears', () => {
    // Step 1 field label, and the card that mirrors the same value in the
    // preview panel beside it.
    const step1 = withoutComments(read('views/wizard/BrandBasicsView.vue'))
    expect(step1).toContain('<LinkIcon')
    expect(step1).not.toContain('<FileIcon')

    const preview = withoutComments(
      read('components/constructor/layout/StepPreviewRightPanel.vue')
    )
    expect(preview).toContain('<LinkIcon')
    expect(preview).not.toContain('<FileIcon')
  })

  it('"Тема" is one Palette on the review Mode row, not a sun and a moon', () => {
    const source = withoutComments(read('components/constructor/review/ReviewConceptBlock.vue'))
    expect(source).toContain('<PaletteIcon')
    expect(source).not.toContain('<SunIcon')
    expect(source).not.toContain('<MoonIcon')
  })

  it('"Placeholder" is ImageSquare Regular in every empty preview panel', () => {
    // The kit's `Type=Placeholder` `4492:11680` puts a 40 `ImageSquare` in its
    // empty square, and the mapping table names it outright: "Placeholder | →
    // ImageSquare, Regular". `ImagePlaceholderIcon.vue` is that glyph;
    // `ImagePlaceholderFilledIcon.vue` is ours, and the kit has no filled
    // weight of it at any size (divergences row 41). It stood in the CEO
    // reselect empty state — the right glyph's wrong twin, in the one place
    // nobody looked, exactly the shape of mistake this file exists for.
    for (const file of [
      'components/constructor/preview/ConceptPreviewSlider.vue',
      'components/constructor/preview/ConceptMobilePreview.vue',
    ]) {
      const source = withoutComments(read(file))
      expect(source).toContain('<ImagePlaceholderIcon')
      expect(source).not.toContain('ImagePlaceholderFilledIcon')
    }
    // And the shell no longer writes its own copy of that box at all.
    expect(withoutComments(read('views/BriefShellView.vue'))).not.toContain(
      'ImagePlaceholderFilledIcon'
    )
  })

  it('the review "Components" row is Sparkle Regular, the only weight the kit has', () => {
    const source = withoutComments(
      read('components/constructor/review/ReviewVisualComponentsBlock.vue')
    )
    expect(source).toContain('<SparklesIcon')
    expect(source).not.toContain('SparklesFilledIcon')
  })

  /**
   * Slots that already matched before this pass. They are pinned because each
   * one is a place a future session could quietly re-point: the comment label
   * sits on all eight steps, the review alert reads as a status and the
   * accordion chevron is the one glyph that arrived on a 16 box.
   */
  it('keeps the slots that already matched', () => {
    expect(withoutComments(read('components/constructor/fields/StepCommentField.vue'))).toContain(
      '<ChatBubbleIcon'
    )
    expect(withoutComments(read('components/constructor/review/ReviewHeader.vue'))).toContain(
      '<CheckBadgeIcon'
    )
    expect(withoutComments(read('components/ui/UiAccordionItem.vue'))).toContain('<CaretDownIcon')
  })
})
