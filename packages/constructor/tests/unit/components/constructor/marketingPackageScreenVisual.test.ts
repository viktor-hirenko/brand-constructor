import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  MARKETING_PACKAGE_CARD_BODY_CLASS,
  MARKETING_PACKAGE_CARD_BORDER_DEFAULT_CLASS,
  MARKETING_PACKAGE_CARD_BORDER_SELECTED_CLASS,
  MARKETING_PACKAGE_CARD_CLASS,
  MARKETING_PACKAGE_CARD_CONTENT_CLASS,
  MARKETING_PACKAGE_CARD_FEATURE_EXCLUDED_CLASS,
  MARKETING_PACKAGE_CARD_FEATURE_LIST_CLASS,
  MARKETING_PACKAGE_CARD_HEADER_CLASS,
  MARKETING_PACKAGE_CARD_ICON_CLASS,
  MARKETING_PACKAGE_CARD_PANEL_CLASS,
  MARKETING_PACKAGE_CARD_PANEL_ICON_CLASS,
  MARKETING_PACKAGE_CARD_PANEL_LABEL_CLASS,
  MARKETING_PACKAGE_CARD_PANEL_ROW_CLASS,
  MARKETING_PACKAGE_CARD_PANEL_VALUE_CLASS,
  MARKETING_PACKAGE_CARD_TILE_CLASS,
  MARKETING_PACKAGE_CARD_TITLE_CLASS,
  MARKETING_PACKAGE_COMMENT_WIDTH_CLASS,
  MARKETING_PACKAGE_GRID_CLASS,
} from '@/constants/marketingPackageCard'
import { UI_BUTTON_KIT_SIZE } from '@/components/ui/uiButton'

/**
 * Step 5 against the drawn screen — `Marketing Package (step 5)` `5411:37221`.
 * https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=5411-37221&m=dev
 *
 * The screen counted as "the designer drew nothing" for the whole project —
 * divergences row 29, the fourth time that reading was wrong. It is drawn, on
 * the `UXUI-2651` canvas no task links to, and this file pins what was wrong
 * once it turned up.
 *
 * Component tests are impossible in this package (no `@vue/test-utils`, no
 * `jsdom`, `vitest.config.ts:11` sets `environment: 'node'`), so the markup is
 * read as text — the idiom of `brandBasicsScreenVisual.test.ts` and
 * `landingScreenVisual.test.ts`. The class map it leans on IS importable, so
 * that half is asserted as values.
 *
 * **Retired class names are assembled, never spelled.** Tailwind v4 reads this
 * file as source and prints a live rule from anything shaped like a utility, so
 * a test that quoted the colour it just removed would put it straight back into
 * the stylesheet — the trap work 6 fell into with the letter-spacing class.
 */

const CONSTRUCTOR = fileURLToPath(new URL('../../../../', import.meta.url))
const SRC = join(CONSTRUCTOR, 'src')
const read = (path: string): string => readFileSync(join(SRC, path), 'utf8')

/** Everything below the doc comments — so a class quoted in prose is not a hit. */
function body(source: string): string {
  return source.replace(/\/\*\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '')
}

const stepView = body(read('views/wizard/MarketingPackageView.vue'))
const skeleton = body(read('components/constructor/skeletons/MarketingPackageGridSkeleton.vue'))
const router = body(read('router/index.ts'))

describe('the step header says the caption once, and says hers', () => {
  it('carries her sentence, full stop and all, in the route meta', () => {
    // `Step header` `5411:37230`.
    expect(router).toContain('Оберіть пакет для запуску вашого бренду.')
  })

  it('no longer prints a second copy of it inside the step', () => {
    // The view opened with a paragraph repeating the caption the header above
    // it was already showing, so the screen said it twice.
    expect(stepView).not.toContain('Оберіть пакет')
  })
})

describe('the grid and the card box', () => {
  it('spaces the cards at 16, not 24', () => {
    // Three cards at x = 0, 394, 788 in a 1166 container → 378 wide, 16 apart;
    // the second row opens at y = 566 against a 550 card, so 16 there too.
    expect(MARKETING_PACKAGE_GRID_CLASS).toContain('gap-4')
    expect(MARKETING_PACKAGE_GRID_CLASS).not.toContain('gap-6')
    expect(stepView).toContain('MARKETING_PACKAGE_GRID_CLASS')
  })

  it('fits as many columns as the PANEL holds, never counting on the window', () => {
    // This shipped as a column count keyed to `xl`, and the owner saw two
    // columns on a 1440 monitor. The class was not wrong about 1440 — it was
    // wrong about whose. A breakpoint inside the wizard resolves against the
    // WIZARD's viewport, and the wizard is an iframe 1230 wide at a 1440
    // window, so `xl` 1280 never fires there. The stand at /wizard/, whose
    // viewport IS the window, showed three and looked correct.
    expect(MARKETING_PACKAGE_GRID_CLASS).toContain('auto-fill')
    expect(MARKETING_PACKAGE_GRID_CLASS).toContain('var(--wizard-package-card-min)')
    expect(MARKETING_PACKAGE_GRID_CLASS).not.toMatch(/\b(?:sm|md|lg|xl|2xl):grid-cols-/)
    expect(MARKETING_PACKAGE_GRID_CLASS).not.toMatch(/\bgrid-cols-\d/)
  })

  it('declares that card size where the concept grid declares its own', () => {
    // Bare `:root`, so the stand and the panel behave alike. 23rem renders her
    // three columns at exactly 378 in her 1166 container and leaves 10 of
    // slack, because three of her 378 plus two gaps come to 1166 EXACTLY and a
    // minimum of 378 would put the third column on a knife edge.
    const css = read('styles/app.css')
    expect(css).toContain('--wizard-package-card-min: 23rem;')
    expect(css).toContain('--wizard-concept-card-min')
  })

  it('gives the card 16 of padding inside a 1px border at radius 16', () => {
    // The inset reads 17 in `get_metadata` because the frame sits inside the
    // card's own stroke — the same trap step 1 fell into with its "26".
    expect(MARKETING_PACKAGE_CARD_CLASS).toContain('p-4')
    expect(MARKETING_PACKAGE_CARD_CLASS).toContain('rounded-2xl')
    expect(MARKETING_PACKAGE_CARD_CLASS).toContain('box-border')
    // A 1px hairline, i.e. the bare `border` utility and not the doubled one.
    expect(MARKETING_PACKAGE_CARD_CLASS).toMatch(/(^|\s)border(\s|$)/)
    expect(MARKETING_PACKAGE_CARD_CLASS).not.toContain('border-2')
    // radius 14 was in no kit section at all.
    expect(MARKETING_PACKAGE_CARD_CLASS).not.toContain('14px]')
  })

  it('lets the cards of a row share the tallest height', () => {
    // Her rows are three cards of 550, the longest description setting it.
    expect(MARKETING_PACKAGE_CARD_CLASS).toContain('h-full')
    expect(MARKETING_PACKAGE_CARD_CLASS).not.toContain('280px]')
  })

  it('carries no shadow and no tint — neither is in any kit section', () => {
    const card = `${MARKETING_PACKAGE_CARD_CLASS} ${MARKETING_PACKAGE_CARD_BORDER_SELECTED_CLASS}`
    expect(card).not.toContain('shadow')
    expect(card).not.toContain('3,2,19,0')
    expect(stepView).not.toContain('shadow-[')
  })
})

describe('the border colour, which can only ever be one', () => {
  it('draws section card/border by default and the picked frame when picked', () => {
    expect(MARKETING_PACKAGE_CARD_BORDER_DEFAULT_CLASS).toContain('border-ink-300')
    expect(MARKETING_PACKAGE_CARD_BORDER_SELECTED_CLASS).toContain('border-primary')
  })

  it('never puts two border colours on the one card', () => {
    // Which of two same-weight colour utilities wins is decided by Tailwind's
    // own output order, not by the order they are written — the way the
    // accordion lost its selected border to a `border-transparent` printed
    // later. So the state CHOOSES a class; the base carries none.
    expect(MARKETING_PACKAGE_CARD_CLASS).not.toMatch(/\bborder-(ink|primary|black|transparent)/)
    expect(stepView).toContain('MARKETING_PACKAGE_CARD_BORDER_SELECTED_CLASS')
    expect(stepView).toContain('MARKETING_PACKAGE_CARD_BORDER_DEFAULT_CLASS')
  })
})

describe('inside the card', () => {
  it('puts 12 between the content column and the button, and 12 above the body', () => {
    // Content 344×464 at y = 17, button 40 tall at y = 493 → 12; the body opens
    // at y = 44 against a 32 glyph row → 12 again.
    expect(MARKETING_PACKAGE_CARD_CLASS).toContain('gap-3')
    expect(MARKETING_PACKAGE_CARD_CONTENT_CLASS).toContain('gap-3')
    expect(MARKETING_PACKAGE_CARD_CONTENT_CLASS).toContain('flex-1')
  })

  it('sits the 16 glyph in a 32 tile on bg/alt-3, not a 48 one', () => {
    expect(MARKETING_PACKAGE_CARD_TILE_CLASS).toContain('bg-ink-300')
    expect(MARKETING_PACKAGE_CARD_TILE_CLASS).toContain('rounded-lg')
    // 32 = the 16 glyph + 8 of padding on each side.
    expect(MARKETING_PACKAGE_CARD_TILE_CLASS).toContain('p-2')
    expect(MARKETING_PACKAGE_CARD_ICON_CLASS).toContain('size-4')
    expect(MARKETING_PACKAGE_CARD_ICON_CLASS).not.toContain('size-6')
    expect(MARKETING_PACKAGE_CARD_TILE_CLASS).not.toContain('10px]')
    expect(stepView).toContain('MARKETING_PACKAGE_CARD_TILE_CLASS')
  })

  it('draws the title at caption/l 14/16 and centred on the band', () => {
    expect(MARKETING_PACKAGE_CARD_TITLE_CLASS).toContain('text-sm/4')
    expect(MARKETING_PACKAGE_CARD_TITLE_CLASS).toContain('font-medium')
    expect(MARKETING_PACKAGE_CARD_TITLE_CLASS).toContain('text-ink-900')
    // It was `header/s` 18/24 nudged down by a margin that only existed to
    // centre it against the 48 tile.
    expect(MARKETING_PACKAGE_CARD_TITLE_CLASS).not.toContain('text-lg')
    expect(MARKETING_PACKAGE_CARD_HEADER_CLASS).toContain('items-center')
    expect(MARKETING_PACKAGE_CARD_HEADER_CLASS).toContain('gap-2')
    expect(stepView).not.toContain('mt-2.5')
  })

  it('spaces the two inner boxes at 8', () => {
    expect(MARKETING_PACKAGE_CARD_BODY_CLASS).toContain('gap-2')
    expect(stepView).toContain('MARKETING_PACKAGE_CARD_BODY_CLASS')
  })
})

describe('divergences row 109 — the colour no search by hex could find', () => {
  it('fills both inner boxes with bg/alt-1 at padding 8', () => {
    expect(MARKETING_PACKAGE_CARD_PANEL_CLASS).toContain('bg-ink-100')
    expect(MARKETING_PACKAGE_CARD_PANEL_CLASS).toContain('rounded-lg')
    expect(MARKETING_PACKAGE_CARD_PANEL_CLASS).toContain('p-2')
    expect(MARKETING_PACKAGE_CARD_PANEL_CLASS).toContain('gap-1')
  })

  it('leaves the colour in no utility anywhere in the tree, in either spelling', () => {
    // It survived every hex search for a whole plan because it was written in
    // the `rgba` form, so BOTH spellings are checked — but only inside an
    // arbitrary-value utility. That is the project's own rule: a bare hex in a
    // sentence explaining where the colour went is not the colour, and six such
    // sentences are deliberately in the tree. Only `[…]` reaches the stylesheet.
    //
    // The pattern is assembled rather than spelled, because Tailwind reads this
    // test as source too and would print back any utility written out in it.
    const IN_UTILITY = new RegExp(
      '\\[[^\\]]*(?:ececf0|' + ['236', '236', '240'].join('\\s*,\\s*') + ')[^\\]]*\\]',
      'i',
    )

    const offenders: string[] = []
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry)
        if (statSync(path).isDirectory()) {
          walk(path)
          continue
        }
        // Extensions only. `.swarm/agentdb-memory.db` files live inside `src`,
        // are gitignored and invisible in review, and hold chunks of the very
        // source being edited — a walk that reads them accuses files that are
        // clean. That is how `legacyScss.test.ts` lied for months.
        if (!/\.(vue|ts|css)$/.test(entry)) continue
        const text = readFileSync(path, 'utf8')
        if (IN_UTILITY.test(text)) offenders.push(path.slice(SRC.length + 1))
      }
    }
    walk(SRC)

    expect(offenders).toEqual([])
  })

  it("keeps the skeleton on the card's own classes instead of a second copy", () => {
    // Two of the four boxes row 109 counted were in the skeleton, because it
    // restated the card's geometry rather than borrowing it.
    expect(skeleton).toContain('MARKETING_PACKAGE_CARD_PANEL_CLASS')
    expect(skeleton).toContain('MARKETING_PACKAGE_CARD_CLASS')
    expect(skeleton).toContain('MARKETING_PACKAGE_GRID_CLASS')
    expect(skeleton).not.toContain('p-3')
    expect(skeleton).not.toContain('10px]')
  })
})

describe('the timeline box', () => {
  it('spaces glyph and caption at 4, where it was 8', () => {
    expect(MARKETING_PACKAGE_CARD_PANEL_ROW_CLASS).toContain('gap-1')
    expect(MARKETING_PACKAGE_CARD_PANEL_ICON_CLASS).toContain('size-4')
    expect(MARKETING_PACKAGE_CARD_PANEL_ICON_CLASS).toContain('text-ink-700')
  })

  it('draws caption and value both at caption/m 12/16', () => {
    expect(MARKETING_PACKAGE_CARD_PANEL_LABEL_CLASS).toContain('text-xs/4')
    expect(MARKETING_PACKAGE_CARD_PANEL_LABEL_CLASS).toContain('text-ink-700')
    expect(MARKETING_PACKAGE_CARD_PANEL_VALUE_CLASS).toContain('text-xs/4')
    expect(MARKETING_PACKAGE_CARD_PANEL_VALUE_CLASS).toContain('font-medium')
    expect(MARKETING_PACKAGE_CARD_PANEL_VALUE_CLASS).toContain('text-ink-900')
    // The value was `caption/l` 14, one size up from what she draws.
    expect(MARKETING_PACKAGE_CARD_PANEL_VALUE_CLASS).not.toContain('text-sm')
  })
})

describe('the component list — bullets, which is what she draws', () => {
  it('is a disc list indented 18 with 4 between items', () => {
    expect(MARKETING_PACKAGE_CARD_FEATURE_LIST_CLASS).toContain('list-disc')
    expect(MARKETING_PACKAGE_CARD_FEATURE_LIST_CLASS).toContain('space-y-1')
    expect(MARKETING_PACKAGE_CARD_FEATURE_LIST_CLASS).toContain('ps-[1.125rem]')
    expect(MARKETING_PACKAGE_CARD_FEATURE_LIST_CLASS).toContain('text-xs/4')
  })

  it('does not turn the list into a flex container', () => {
    // A marker needs the item to stay `display: list-item`, and a flex list is
    // the one layout that puts that at the mercy of blockification. The 4 of
    // spacing comes from a margin utility instead.
    expect(MARKETING_PACKAGE_CARD_FEATURE_LIST_CLASS).not.toContain('flex')
  })

  it('no longer marks every included line with a tick', () => {
    // She draws no include/exclude distinction and production has none either:
    // every line of every one of the six packages is a `+`.
    expect(stepView).not.toContain('CheckIcon\n                      v-if="feature.included"')
    expect(stepView).not.toContain('gap-1.5')
  })

  it('keeps the cross for the lines an admin can still mark excluded', () => {
    // Divergences row 116 — the bullet is hers, this half is ours, the same
    // split phase 17 made on the domain chips.
    expect(stepView).toContain('MARKETING_PACKAGE_CARD_FEATURE_EXCLUDED_CLASS')
    expect(MARKETING_PACKAGE_CARD_FEATURE_EXCLUDED_CLASS).toContain('list-none')
    // The cross takes the bullet's place, so the item steps back the indent.
    expect(MARKETING_PACKAGE_CARD_FEATURE_EXCLUDED_CLASS).toContain('-ms-[1.125rem]')
  })
})

describe('the detail button', () => {
  it('is the kit Secondary M-40 and not a hand-rolled button', () => {
    expect(stepView).toContain('<UiButton')
    expect(stepView).toContain('variant="secondary"')
    expect(stepView).toContain('size="M"')
    // 40 tall, padding 12, a 16 glyph and a 14/16 label — the drawn button.
    expect(UI_BUTTON_KIT_SIZE.M.root).toContain('h-10')
    expect(UI_BUTTON_KIT_SIZE.M.root).toContain('p-3')
    expect(UI_BUTTON_KIT_SIZE.M.icon).toContain('size-4')
    // The raw `<button>` it replaces carried radius 10 and its own hover wash.
    expect(stepView).not.toContain('py-2.5')
    expect(stepView).not.toContain('hover:bg-black/')
  })
})

describe('the selected card — a state the kit does not draw', () => {
  it("marks it with the wizard's own kit icon button, not a bespoke disc", () => {
    // Divergences row 115. Same mark the concept cards already carry for
    // exactly this job — kit icon button Solid S-32, rendered decoratively
    // because the card itself is the control.
    expect(stepView).toContain('resolveUiIconButtonClasses')
    expect(stepView).toContain("variant: 'solid'")
    expect(stepView).toContain('decorative: true')
    expect(stepView).not.toContain('rounded-full bg-[')
  })

  it('hangs the mark in the glyph row instead of over the package icon', () => {
    // It first went at the card's top-left corner, copying the concept card —
    // but the concept card overlays a photograph, and here what is underneath
    // is the package's own 32 tile, which the mark covered completely. The
    // owner saw a tick where the shield should be.
    expect(stepView).not.toContain('absolute top-2 left-2')
    expect(stepView).not.toContain('class="relative"')
    // Bound inside the header block, not merely present in the file.
    //
    // `lastIndexOf`, because the first occurrence of either name is the IMPORT
    // line, where they stand alphabetically — and `BODY` sorts before `HEADER`,
    // so slicing on `indexOf` produced an empty string that passed nothing.
    // Same trap as the GEO chip group: a guard reading source as text must
    // land on the markup, not on the import.
    const header = stepView.slice(
      stepView.lastIndexOf('MARKETING_PACKAGE_CARD_HEADER_CLASS'),
      stepView.lastIndexOf('MARKETING_PACKAGE_CARD_BODY_CLASS'),
    )
    expect(header.length).toBeGreaterThan(0)
    expect(header).toContain('selectedMarkClasses.root')
    expect(header).toContain('MARKETING_PACKAGE_CARD_TILE_CLASS')
  })
})

describe('the comment field', () => {
  it('stands half the container wide, as drawn', () => {
    // Input 583 in a 1166 container. The number is not frozen — a fixed width
    // survives one breakpoint, the reading row 111 made of the step 1 card.
    expect(MARKETING_PACKAGE_COMMENT_WIDTH_CLASS).toContain('lg:w-1/2')
    expect(MARKETING_PACKAGE_COMMENT_WIDTH_CLASS).not.toContain('583')
    expect(stepView).toContain('MARKETING_PACKAGE_COMMENT_WIDTH_CLASS')
  })

  it('sits the drawn 24 from the grid, not 24 plus its own 8', () => {
    // Grid ends at y = 1116, the Input opens at 1140.
    expect(stepView).toContain('flush')
  })
})
