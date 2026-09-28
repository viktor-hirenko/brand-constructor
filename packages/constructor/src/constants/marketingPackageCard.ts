/**
 * The package cards of step 5 — measured off the drawn screen
 * `Marketing Package (step 5)` `5411:37221`, 1440×1566.
 * https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=5411-37221&m=dev
 *
 * The screen counted as "the designer drew nothing" for the whole project — the
 * fourth time that reading was wrong. It lives on the `UXUI-2651` canvas no task
 * links to, next to the drawn step 0, step 1 and step 6.
 *
 * ── What `get_metadata` measures on `Frame 2087327406` `5658:39001`
 *
 *   row            three cards at x = 0, 394, 788 in a 1166 container
 *                  → card 378 wide, `spacing/16` between them
 *   card           378 × 550, the second row opens at y = 566 → 16 there too
 *   inner inset    17 = padding 16 + the card's own 1 of border
 *   glyph row      344 × 32 at (17, 17)
 *   tile           32 × 32, glyph 16 centred in it → padding 8
 *   title          x = 40 → 8 to the right of the tile, 16 tall
 *   body           y = 44 → 12 below the glyph row
 *   timeline box   344 × 52 = padding 8 + label 16 + 4 + value 16 + padding 8
 *   description    opens 8 below the timeline box, same padding 8
 *   button         344 × 40 at y = 493 → 12 below the content, 17 to the floor
 *
 * and `get_variable_defs` on the card, both inner boxes and the button:
 *
 *   card fill      `bg/body`             #ffffff
 *   card border    `section card/border` #eaeaeb, stroke 1
 *   card radius    `radius/section-card` 16
 *   tile fill      `bg/alt-3`            #eaeaeb, `radius/button` 8
 *   title          `caption/l/medium`    14/16 Medium, `content/primary` #1f1f2e
 *   inner box      `bg/alt-1`            #f9f9fb, `radius/button` 8
 *   box label      `caption/m/regular`   12/16, `content/tertiary` #6f6f7d
 *   box value      `caption/m/medium`    12/16 Medium, `content/primary` #1f1f2e
 *   button         `Button` Secondary M-40, i.e. `ui/uiButton.ts` — no recipe
 *                  of its own is needed here
 *
 * ── The inset is 16, not 17, and that is the same trap as step 1
 *
 * `get_metadata` reports the content frame at (17, 17) because the card strokes
 * itself 1px and the frame sits inside that stroke. Step 1 read the identical
 * shape as "padding 26" when it was padding 24 plus a 2px border. Only
 * `get_design_context` on the card itself spells `p-[16px]` and `border`.
 *
 * ── Divergences row 109 closes here, and not by a repaint
 *
 * The two inner boxes were filled with `#ececf0` at half alpha, written in the
 * `rgba` form — a hex the kit does not contain anywhere, and the one spelling
 * of it that no search by hex could ever find. The drawn screen says what the
 * box actually is: `bg/alt-1` #f9f9fb. So the colour is measured, not chosen.
 *
 * The retired value is not written out here, or anywhere else in the tree:
 * Tailwind v4 reads comments as source and prints a live rule from anything
 * shaped like a class, which is how work 6 put five dead rules in the stylesheet
 * while trying to remove ten.
 *
 * ── Two things the designer does not draw, kept as ours
 *
 * 1. **A selected card.** All six cards on `5411:37221` are unselected and the
 *    kit has no Selected variant for this frame. Selection is live product
 *    behaviour, so it keeps the mark the wizard already uses for exactly this
 *    job on the concept cards: the `concept-card/border` #030213 frame plus the
 *    kit icon button Solid S-32 check, `constants/conceptCardVisual.ts`. What
 *    goes is the recipe that was in no kit section at all — a two-layer shadow,
 *    a black wash at 5% and a bespoke 32 black disc. Divergences row 115.
 * 2. **An excluded feature.** She draws the component list as plain disc
 *    bullets with no include/exclude distinction, and in production none of the
 *    six packages has one: every line of `components_list` is a `+`. The bullet
 *    is hers; the cross stays ours for the `-` lines an admin can still author,
 *    the same split phase 17 made on the domain chips. Divergences row 116.
 *
 * ── Why a `.ts` map and not a component test
 *
 * `packages/constructor` has no `@vue/test-utils` and no `jsdom`, and
 * `vitest.config.ts:11` sets `environment: 'node'` — mounting is impossible, so
 * the class decision is a pure function. Same idiom as
 * `constants/stepOnePreviewCard.ts` and `ui/uiSectionCard.ts`.
 *
 * ── Lengths
 *
 * Every length is a rem-based Tailwind utility. The 1 of border is the same
 * documented px exception the kit's hairline borders take, and the 1.125rem the
 * bullet list is indented by is the kit's own 18 at the fixed root of 16.
 */

/**
 * The grid — `spacing/16` between cards, where it was 24.
 *
 * The column counts are left exactly as they were. At 1440 the drawn three
 * columns are what `xl` already gives, and the responsive behaviour of this
 * step was not part of the measurement.
 */
export const MARKETING_PACKAGE_GRID_CLASS =
  'marketing-package-grid grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3'

/**
 * The comment field under the grid — the drawn 583 in a 1166 container, i.e.
 * exactly half of it.
 *
 * The number itself is not taken. A fixed 583 survives one breakpoint only, the
 * same reading divergences row 111 made of the step 1 card; the proportion is
 * what is taken, and from the width at which the step stops being one column.
 * At 1440 that is her 583 exactly.
 */
export const MARKETING_PACKAGE_COMMENT_WIDTH_CLASS =
  'marketing-package-comment w-full lg:w-1/2'

/**
 * The card body: `bg/body` on a 1px `section card/border`, radius 16, padding
 * 16, and 12 between the content column and the button.
 *
 * `box-border` keeps the 1 of border inside the drawn 378 — the lesson phase 1
 * learned on the footer buttons. `h-full` is what makes the six cards of a row
 * share the tallest height, which is how the drawn rows are built (three cards
 * of 550 each, the tallest description setting the number).
 *
 * The border COLOUR is not here. It is handed in per state so that the default
 * and the selected frame can never both be on the element at once — the way the
 * accordion lost its selected border to a `border-transparent` that Tailwind
 * happened to print later.
 */
export const MARKETING_PACKAGE_CARD_CLASS =
  'marketing-package-card box-border flex h-full w-full cursor-pointer flex-col gap-3 rounded-2xl border border-solid bg-white p-4 transition-[border-color]'

/** `section card/border` #eaeaeb — every card on the drawn screen. */
export const MARKETING_PACKAGE_CARD_BORDER_DEFAULT_CLASS = 'border-ink-300 hover:border-ink-500'

/**
 * `concept-card/border` #030213 — the frame the wizard already uses to say
 * "this one is picked". The kit draws no selected package card; see the header.
 */
export const MARKETING_PACKAGE_CARD_BORDER_SELECTED_CLASS = 'border-primary'

/** Content column above the button; `flex-1` is what pins the button to the floor. */
export const MARKETING_PACKAGE_CARD_CONTENT_CLASS =
  'marketing-package-card__content flex min-h-0 w-full flex-1 flex-col gap-3'

/** Tile · `spacing/8` · title, all centred on the 32-tall band. */
export const MARKETING_PACKAGE_CARD_HEADER_CLASS =
  'marketing-package-card__header flex w-full items-center gap-2'

/**
 * The tile the glyph sits in — 32 square, which is the 16 glyph plus 8 of
 * padding, on `bg/alt-3` at `radius/button` 8. It was 48 at radius 10 on black
 * at 10%, a fill the kit does not contain.
 */
export const MARKETING_PACKAGE_CARD_TILE_CLASS =
  'marketing-package-card__tile flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-ink-300 p-2'

/** `Icon` 16 in `content/primary`. It was 24, and grey when unselected. */
export const MARKETING_PACKAGE_CARD_ICON_CLASS =
  'marketing-package-card__icon size-4 shrink-0 text-ink-900'

/**
 * `caption/l/medium` 14/16 in `content/primary`, taking the rest of the band.
 * It was `header/s` 18/24 nudged down 10 by a `mt-2.5` that only existed to
 * centre it against the 48 tile.
 */
export const MARKETING_PACKAGE_CARD_TITLE_CLASS =
  'marketing-package-card__title min-w-0 flex-1 text-sm/4 font-medium text-ink-900'

/** The two inner boxes, `spacing/8` apart. */
export const MARKETING_PACKAGE_CARD_BODY_CLASS =
  'marketing-package-card__body flex w-full flex-col gap-2'

/**
 * Both inner boxes: `bg/alt-1` #f9f9fb, `radius/button` 8, padding 8, 4 inside.
 * This is the class that retires the half-alpha `#ececf0` — divergences row 109.
 */
export const MARKETING_PACKAGE_CARD_PANEL_CLASS =
  'marketing-package-card__panel flex w-full flex-col gap-1 rounded-lg bg-ink-100 p-2'

/** Glyph · `spacing/4` · caption, on the 16-tall label row of the timeline box. */
export const MARKETING_PACKAGE_CARD_PANEL_ROW_CLASS =
  'marketing-package-card__panel-row flex w-full items-center gap-1'

/** `Frame` 16 in `content/tertiary`. The gap to the caption was 8. */
export const MARKETING_PACKAGE_CARD_PANEL_ICON_CLASS =
  'marketing-package-card__panel-icon size-4 shrink-0 text-ink-700'

/** `caption/m/regular` 12/16 in `content/tertiary` — both box captions. */
export const MARKETING_PACKAGE_CARD_PANEL_LABEL_CLASS =
  'marketing-package-card__panel-label min-w-0 flex-1 text-xs/4 text-ink-700'

/**
 * `caption/m/medium` 12/16 in `content/primary` — the timeline value. It was
 * `caption/l` 14, one step up from what she draws.
 */
export const MARKETING_PACKAGE_CARD_PANEL_VALUE_CLASS =
  'marketing-package-card__panel-value w-full text-xs/4 font-medium text-ink-900'

/**
 * The component list: `caption/m/regular` 12/16 in `content/primary` as a disc
 * list indented 18, items 4 apart.
 *
 * `space-y-1` and not `flex flex-col gap-1`: a list marker needs the item to
 * stay `display: list-item`, and turning the list into a flex container is the
 * one layout that puts that at the mercy of blockification. The spacing is the
 * same 4 either way.
 */
export const MARKETING_PACKAGE_CARD_FEATURE_LIST_CLASS =
  'marketing-package-card__features w-full list-disc space-y-1 ps-[1.125rem] text-xs/4 text-ink-900'

/**
 * A line the admin marked `-`. She draws no such line, so this half is ours:
 * the cross takes the bullet's place, which is why the item drops its marker
 * and steps back the 18 the list is indented by.
 */
export const MARKETING_PACKAGE_CARD_FEATURE_EXCLUDED_CLASS =
  'marketing-package-card__feature--excluded -ms-[1.125rem] flex list-none items-start gap-1 text-ink-700'

/** The cross itself, nudged onto the first line's baseline. */
export const MARKETING_PACKAGE_CARD_FEATURE_CROSS_CLASS =
  'marketing-package-card__feature-cross mt-0.5 size-3 shrink-0'
