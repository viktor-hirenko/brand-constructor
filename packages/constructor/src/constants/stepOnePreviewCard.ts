/**
 * The summary cards in the right column of step 1 — measured off the drawn
 * screen `Brand Basics (step 1)` `5409:35822`.
 * https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=5409-35822&m=dev
 *
 * ── Why this is its own map and not `UiSectionCard` + `UiProperty`
 *
 * Because the designer did not draw it with them. The two cards on that screen
 * are plain frames — `Frame 2087327399` and `Frame 2087327400`, with
 * `Frame 2087327398` and `Frame 2087327387` inside — not instances of
 * `Section card` `3761:2273` or of `Property` `3761:2281`. Their shape differs
 * from Property's in the one way that matters: **the value is not indented
 * under the label.** Property hangs label and value in a column beside the
 * glyph; here the glyph row is one band and the value is a second band at the
 * card's own left edge, full width.
 *
 * Step 8's review IS built from those two kit components and is drawn that way,
 * so bending them to fit step 1 would move a screen that is already correct.
 *
 * ── What `get_metadata` measures on `Right panel` `5409:36005`
 *
 *   card            543 × 124, the next one at y = 180 → gap 24 between cards
 *   inner inset     26  = padding 24 + the card's own 2 of border
 *   glyph row       491 × 36 at (26, 26)
 *   tile            36 × 36, glyph 20 centred in it → padding 8
 *   label           x = 44 → 8 to the right of the tile, 16 tall
 *   value           y = 74 → 12 below the row, 24 tall, at the card's x = 26
 *                   (NOT at the label's 44)
 *
 * and `get_variable_defs` on the card, the tile glyph and the value:
 *
 *   card fill       `bg/body`            #ffffff
 *   card border     `section card/border` #eaeaeb, stroke 2
 *   tile fill       `bg/alt-3`           #eaeaeb
 *   tile glyph      `content/primary`    #1f1f2e
 *   label           `caption/l/medium`   14/16 Medium, `content/primary` #1f1f2e
 *   value           `header/s`           18/24 Medium
 *
 * ── Two numbers that do NOT go in, and why they are named here
 *
 * 1. **Width 543.** The panel is 639 with 32 of padding, so its content box is
 *    575; a 543 card leaves 32 on the left and 64 on the right. There is no
 *    rule that produces that pair, and a fixed pixel width cannot survive the
 *    responsive columns at all — the panel is 543 at 1280 and 904 at 2560. The
 *    card fills the content box. Divergences row 111.
 * 2. **A black value.** The value text node `5409:36424` returns the `header/s`
 *    type and NO colour variable, i.e. its fill is an untokened #000000, while
 *    the identical value on the kit's own Section card is
 *    `section card/content/value` #1f1f2e. Every other value in the product is
 *    that token. Kept on the token; divergences row 112.
 *
 * ── Why a `.ts` map and not a component test
 *
 * `packages/constructor` has no `@vue/test-utils` and no `jsdom`, and
 * `vitest.config.ts:11` sets `environment: 'node'` — mounting is impossible, so
 * the class decision is a pure function. Same idiom as `ui/uiSectionCard.ts`,
 * `ui/uiProperty.ts` and `constants/previewLayout.ts`.
 *
 * ── Lengths
 *
 * Every length is a rem-based Tailwind utility. The 2 of border is the same
 * documented px exception the kit's hairline borders take.
 */

/**
 * The list of cards — `spacing/24` between neighbours (124 tall, next at
 * y = 180). It was `spacing/16`, borrowed from the review screen, which is the
 * gap the kit's Section card list uses and not this one.
 */
export const STEP_ONE_CARD_LIST_CLASS = 'flex flex-col gap-6'

/**
 * The card: `bg/body` on a 2px `section card/border`, `radius/section-card` 16,
 * padding 24, and 12 between the glyph row and the value.
 *
 * `box-border` keeps the 2 of border inside the drawn 543 × 124 — the lesson
 * phase 1 learned on the footer buttons and `uiSectionCard.ts` repeats.
 *
 * The recipe it replaces was in no kit section at all: radius 14, a two-layer
 * shadow and a `black/10` frame (divergences row 96). Work 6 took that down to
 * the kit's Section card surface; the drawn screen then supplied the numbers
 * for the inside, which that surface got wrong — padding 16 for 24, border 1
 * for 2.
 */
export const STEP_ONE_CARD_CLASS =
  'step-one-card box-border flex w-full flex-col gap-3 rounded-2xl border-2 border-solid border-ink-300 bg-white p-6'

/** Tile · `spacing/8` · label, both centred on the 36-tall band. */
export const STEP_ONE_CARD_ROW_CLASS = 'step-one-card__row flex items-center gap-2'

/**
 * The tile the glyph sits in — 36 square, which is the 20 glyph plus 8 of
 * padding, on `bg/alt-3` at `radius/button` 8. The glyph used to stand bare.
 */
export const STEP_ONE_CARD_TILE_CLASS =
  'step-one-card__tile flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-ink-300 p-2'

/** `Icon` 20 in `content/primary`. It was 20 in #6f6f7d, the Property colour. */
export const STEP_ONE_CARD_ICON_CLASS = 'step-one-card__icon size-5 shrink-0 text-ink-900'

/**
 * `caption/l/medium` 14/16 in `content/primary` #1f1f2e, taking the rest of the
 * band. Property draws this same line in `section card/content/label` #6f6f7d,
 * which is the colour it carried here.
 */
export const STEP_ONE_CARD_LABEL_CLASS =
  'step-one-card__label min-w-0 flex-1 text-sm/4 font-medium text-ink-900'

/**
 * `header/s` 18/24 Medium, full width at the card's own left edge — not
 * indented under the label. It was `body/regular` 16/24 inside the Property
 * column, i.e. one size down and 28 to the right of where it is drawn.
 */
export const STEP_ONE_CARD_VALUE_CLASS =
  'step-one-card__value w-full text-lg/6 font-medium text-ink-900'
