/**
 * The two option cards of step 6 — measured off the drawn screen
 * `Deliverables (step 6)` `5411:37951`, 1440×768.
 * https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=5411-37951&m=dev
 *
 * Found on the `UXUI-2651` canvas together with the drawn steps 0, 1 and 5.
 *
 * ── What `get_metadata` measures on `Frame 2087327410` `5411:37962`
 *
 *   row            two cards at x = 0 and 591 in a 1166 container
 *                  → card 575 wide, `spacing/16` between them
 *   card           575 × 106, both the same height though one description
 *                  wraps to two lines and the other does not
 *   inner inset    17 = padding 16 + the card's own 1 of border
 *   glyph row      541 × 36 at (17, 17)
 *   tile           36 × 36, glyph 20 centred in it → padding 8
 *   title          x = 48 → 12 to the right of the tile, 24 tall
 *   toggle         48 × 24 ending flush with the content's right edge
 *   description    y = 57 → 4 below the glyph row, inset 48 on BOTH sides
 *
 * and `get_variable_defs` on the card, the tile and both texts:
 *
 *   card fill      `bg/body`             #ffffff
 *   card border    `section card/border` #eaeaeb, stroke 1
 *   card radius    `radius/section-card` 16
 *   tile fill      `bg/alt-3`            #eaeaeb, `radius/button` 8
 *   title          `body/medium`         16/24 Medium, `content/primary` #1f1f2e
 *   description    `caption/m/regular`   12/16, `content/tertiary` #6f6f7d
 *   toggle         `toggle/bg/selected`  #030213 — `ui/uiToggle.ts` already
 *
 * ── The 48 on the right is not symmetry for its own sake
 *
 * Left 48 is the tile 36 plus the 12 gap, so the description starts under the
 * title. Right 48 is the width of the toggle, so the description clears the
 * control above it. Both numbers come out of the row, which is why they are
 * written as one `px-12` rather than as a measured pair.
 *
 * ── What the card was
 *
 * A `#f3f3f5` fill on a `black/10` frame at radius 14 with 24 of padding, a 48
 * tile at radius 10 on black at 10%, an 18/24 title and a 14 description. The
 * fill and both frame colours are hexes the kit does not contain.
 *
 * ── Why a `.ts` map and not a component test
 *
 * `packages/constructor` has no `@vue/test-utils` and no `jsdom`, and
 * `vitest.config.ts:11` sets `environment: 'node'` — mounting is impossible, so
 * the class decision is a pure function. Same idiom as
 * `constants/marketingPackageCard.ts` and `constants/stepOnePreviewCard.ts`.
 *
 * ── Lengths
 *
 * Every length is a rem-based Tailwind utility. The 1 of border is the same
 * documented px exception the kit's hairline borders take.
 */

/** The row — `spacing/16` between the two cards, where it was 24. */
export const DELIVERABLE_GRID_CLASS =
  'deliverable-grid grid grid-cols-1 gap-4 lg:grid-cols-2'

/**
 * The card: `bg/body` on a 1px `section card/border`, radius 16, padding 16,
 * and 4 between the glyph row and the description.
 *
 * `box-border` keeps the 1 of border inside the drawn 575. `h-full` is what
 * makes the pair share a height when one description wraps and the other does
 * not — which is how the drawn row stands, both cards 106.
 */
export const DELIVERABLE_CARD_CLASS =
  'deliverable-card box-border flex h-full w-full flex-col gap-1 rounded-2xl border border-solid border-ink-300 bg-white p-4'

/** Tile · `spacing/12` · title · toggle, all centred on the 36-tall band. */
export const DELIVERABLE_CARD_HEADER_CLASS =
  'deliverable-card__header flex w-full items-center gap-3'

/**
 * The tile the glyph sits in — 36 square, which is the 20 glyph plus 8 of
 * padding, on `bg/alt-3` at `radius/button` 8.
 */
export const DELIVERABLE_CARD_TILE_CLASS =
  'deliverable-card__tile flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-ink-300 p-2'

/** `Icon` 20 in `content/primary`. It was 24 in a 48 tile. */
export const DELIVERABLE_CARD_ICON_CLASS =
  'deliverable-card__icon size-5 shrink-0 text-ink-900'

/** `body/medium` 16/24 in `content/primary`, taking the rest of the band. */
export const DELIVERABLE_CARD_TITLE_CLASS =
  'deliverable-card__title min-w-0 flex-1 text-base/6 font-medium text-ink-900'

/**
 * `caption/m/regular` 12/16 in `content/tertiary`, inset 48 either side — see
 * the header for where both 48s come from. It was 14 with no inset at all,
 * sitting in a text column beside the tile.
 */
export const DELIVERABLE_CARD_DESCRIPTION_CLASS =
  'deliverable-card__description w-full px-12 text-xs/4 text-ink-700'

/**
 * The width of the date and comment fields under the cards: the drawn 575, i.e.
 * one column of the pair.
 *
 * The number itself is not taken — a fixed 575 survives exactly one breakpoint,
 * the same reading divergences row 111 made of the step 1 card. What is taken
 * is the proportion: half the container less half the 16 gap, from the width at
 * which the cards themselves become a pair. At 1440 that is her 575 exactly.
 */
export const DELIVERABLE_FIELD_WIDTH_CLASS =
  'deliverable-field w-full lg:w-[calc((100%-1rem)/2)]'
