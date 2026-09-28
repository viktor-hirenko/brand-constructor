import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  DELIVERABLE_CARD_CLASS,
  DELIVERABLE_CARD_DESCRIPTION_CLASS,
  DELIVERABLE_CARD_HEADER_CLASS,
  DELIVERABLE_CARD_ICON_CLASS,
  DELIVERABLE_CARD_TILE_CLASS,
  DELIVERABLE_CARD_TITLE_CLASS,
  DELIVERABLE_FIELD_WIDTH_CLASS,
  DELIVERABLE_GRID_CLASS,
} from '@/constants/deliverableCard'
import {
  UI_FIELD_ICON_CLASS,
  UI_FIELD_LABEL_CLASS,
  UI_FIELD_LABEL_REQUIRED_CLASS,
} from '@/components/ui/uiField'
import { UI_TOGGLE_TRACK_BASE_CLASS } from '@/components/ui/uiToggle'

/**
 * Step 6 against the drawn screen — `Deliverables (step 6)` `5411:37951`.
 * https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=5411-37951&m=dev
 *
 * Found on the `UXUI-2651` canvas together with the drawn steps 0, 1 and 5 —
 * divergences row 29.
 *
 * Component tests are impossible in this package (no `@vue/test-utils`, no
 * `jsdom`, `vitest.config.ts:11` sets `environment: 'node'`), so the markup is
 * read as text — the idiom of `brandBasicsScreenVisual.test.ts`. The class map
 * it leans on IS importable, so that half is asserted as values.
 */

const SRC = join(fileURLToPath(new URL('../../../../', import.meta.url)), 'src')
const read = (path: string): string => readFileSync(join(SRC, path), 'utf8')

/** Everything below the doc comments — so a class quoted in prose is not a hit. */
function body(source: string): string {
  return source.replace(/\/\*\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '')
}

const stepView = body(read('views/wizard/DeliverablesView.vue'))
const card = body(read('components/constructor/fields/DeliverableToggleCard.vue'))
const router = body(read('router/index.ts'))

describe('the step header says the caption once, and says hers', () => {
  it('carries her sentence, full stop and all, in the route meta', () => {
    // `Step header` `5411:37960`.
    expect(router).toContain('Додаткові опції для вашого проєкту.')
  })

  it('no longer prints a near-copy of it inside the step', () => {
    expect(stepView).not.toContain('Додаткові опції')
    expect(stepView).not.toContain('text-muted-foreground text-base')
  })
})

describe('the pair of option cards', () => {
  it('spaces them at 16, not 24', () => {
    // Two cards at x = 0 and 591 in a 1166 container → 575 wide, 16 apart.
    expect(DELIVERABLE_GRID_CLASS).toContain('gap-4')
    expect(DELIVERABLE_GRID_CLASS).not.toContain('gap-6')
    expect(DELIVERABLE_GRID_CLASS).toContain('lg:grid-cols-2')
    expect(stepView).toContain('DELIVERABLE_GRID_CLASS')
  })

  it('draws the card white on section card/border, not grey on black/10', () => {
    expect(DELIVERABLE_CARD_CLASS).toContain('bg-white')
    expect(DELIVERABLE_CARD_CLASS).toContain('border-ink-300')
    // The fill it had, `#f3f3f5`, is the kit's INPUT surface, not a card.
    expect(DELIVERABLE_CARD_CLASS).not.toContain('f3f3f5')
    expect(DELIVERABLE_CARD_CLASS).not.toContain('border-black/')
  })

  it('gives it 16 of padding inside a 1px border at radius 16', () => {
    // The inset reads 17 in `get_metadata` because the frame sits inside the
    // card's own stroke — the same trap step 1 fell into with its "26".
    expect(DELIVERABLE_CARD_CLASS).toContain('p-4')
    expect(DELIVERABLE_CARD_CLASS).toContain('rounded-2xl')
    expect(DELIVERABLE_CARD_CLASS).toContain('box-border')
    expect(DELIVERABLE_CARD_CLASS).toMatch(/(^|\s)border(\s|$)/)
    expect(DELIVERABLE_CARD_CLASS).not.toContain('border-2')
    expect(DELIVERABLE_CARD_CLASS).not.toContain('14px]')
  })

  it('puts 4 between the glyph row and the description', () => {
    // Row 36 tall at y = 17, description at y = 57.
    expect(DELIVERABLE_CARD_CLASS).toContain('gap-1')
  })

  it('lets the two share a height when one description wraps', () => {
    // Both drawn cards are 106 though one caption is two lines and one is not.
    expect(DELIVERABLE_CARD_CLASS).toContain('h-full')
  })
})

describe('inside the card', () => {
  it('sits the 20 glyph in a 36 tile on bg/alt-3, not a 48 one', () => {
    expect(DELIVERABLE_CARD_TILE_CLASS).toContain('bg-ink-300')
    expect(DELIVERABLE_CARD_TILE_CLASS).toContain('rounded-lg')
    // 36 = the 20 glyph + 8 of padding on each side.
    expect(DELIVERABLE_CARD_TILE_CLASS).toContain('p-2')
    expect(DELIVERABLE_CARD_ICON_CLASS).toContain('size-5')
    expect(DELIVERABLE_CARD_ICON_CLASS).not.toContain('size-6')
    expect(DELIVERABLE_CARD_TILE_CLASS).not.toContain('10px]')
    expect(card).toContain('DELIVERABLE_CARD_TILE_CLASS')
    expect(stepView).toContain('DELIVERABLE_CARD_ICON_CLASS')
  })

  it('spaces tile, title and toggle at 12 on one centred band', () => {
    // Title opens at x = 48 against a 36 tile.
    expect(DELIVERABLE_CARD_HEADER_CLASS).toContain('gap-3')
    expect(DELIVERABLE_CARD_HEADER_CLASS).toContain('items-center')
  })

  it('draws the title at body/medium 16/24, not header/s 18/24', () => {
    expect(DELIVERABLE_CARD_TITLE_CLASS).toContain('text-base/6')
    expect(DELIVERABLE_CARD_TITLE_CLASS).toContain('font-medium')
    expect(DELIVERABLE_CARD_TITLE_CLASS).toContain('text-ink-900')
    expect(DELIVERABLE_CARD_TITLE_CLASS).not.toContain('text-lg')
  })

  it('drops the description to caption/m 12/16 and insets it 48 either side', () => {
    // Left 48 is the tile plus the 12 gap, so the caption starts under the
    // title; right 48 is the toggle's own width, so it clears the control.
    expect(DELIVERABLE_CARD_DESCRIPTION_CLASS).toContain('px-12')
    expect(DELIVERABLE_CARD_DESCRIPTION_CLASS).toContain('text-xs/4')
    expect(DELIVERABLE_CARD_DESCRIPTION_CLASS).toContain('text-ink-700')
    // It was 14 in a text column beside the tile, with no inset at all.
    expect(DELIVERABLE_CARD_DESCRIPTION_CLASS).not.toContain('text-sm')
    expect(card).toContain('DELIVERABLE_CARD_DESCRIPTION_CLASS')
  })

  it('leaves the toggle on the kit 48×24 phase 14 measured', () => {
    expect(UI_TOGGLE_TRACK_BASE_CLASS).toContain('w-12')
    expect(UI_TOGGLE_TRACK_BASE_CLASS).toContain('h-6')
  })

  it('ends both captions with her full stop', () => {
    expect(stepView).toContain('GDPR compliance."')
    expect(stepView).toContain('підписаня контрактів."')
  })
})

describe('the date field', () => {
  it('is the kit Title — a 20 glyph beside body/medium 16/24', () => {
    // `Input` `5411:38242` is Title + `spacing/8` + field. What stood here was
    // a hand-made row with a 16 glyph.
    expect(stepView).toContain('<UiFieldLabel required>')
    expect(stepView).not.toContain('CalendarIcon class="size-4')
    expect(UI_FIELD_ICON_CLASS).toContain('size-5')
    expect(UI_FIELD_LABEL_CLASS).toContain('text-base')
    expect(UI_FIELD_LABEL_CLASS).toContain('gap-2')
  })

  it('keeps the asterisk red, where she draws it white on white', () => {
    // Divergences row 113, settled by the owner on the drawn step 1: without a
    // mark a required field is indistinguishable from an optional one, and the
    // validation below is live.
    expect(UI_FIELD_LABEL_REQUIRED_CLASS).toContain('text-red-content')
    expect(stepView).not.toContain('text-red-500')
  })

  it('puts the validation line through the kit Description', () => {
    expect(stepView).toContain('<UiFieldHint')
    expect(stepView).toContain('tone="error"')
  })
})

describe('the two fields under the cards', () => {
  it('stand one column wide, as drawn, without freezing her pixel', () => {
    // Both Inputs are 575 — one column of the pair. A fixed width survives one
    // breakpoint only, the reading row 111 made of the step 1 card, so what is
    // taken is the proportion, from the width at which the cards become a pair.
    expect(DELIVERABLE_FIELD_WIDTH_CLASS).toContain('lg:w-[calc((100%-1rem)/2)]')
    expect(DELIVERABLE_FIELD_WIDTH_CLASS).not.toContain('575')
    // Bound in the template, not merely imported: the import line names the
    // constant too, which is how a plain `toContain` stayed green on the GEO
    // chip group after the group had been ripped out of the markup.
    expect(stepView).toContain('[DELIVERABLE_FIELD_WIDTH_CLASS,')
    expect(stepView).toContain(':class="DELIVERABLE_FIELD_WIDTH_CLASS"')
  })

  it('sits the comment the drawn 24 below, not 24 plus its own 8', () => {
    // Date Input at y = 130 and 80 tall, comment Input at y = 234.
    expect(stepView).toContain('flush')
  })

  it('stacks the three blocks at the flat 24 she draws', () => {
    // Cards end at 106, date Input opens at 130.
    expect(stepView).toContain('flex flex-col gap-6')
  })
})
