/**
 * The right column of the wizard — kit `Preview panel` `3839:9513`.
 * https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=3839-9513&m=dev
 *
 * One component, three types, and every screen of the wizard uses one of them:
 *
 *   `Type=Concept preview` `3717:5449`  steps 2, 3, 4 and the edit flows
 *   `Type=UI preview`      `3839:9514`  steps 7 and 8
 *   `Type=Placeholder`     `4492:11680` every empty state
 *
 * All three are built the same way: a white panel with `spacing/32` on all four
 * sides, a `Content` column at `spacing/24`, a `Header` exactly 32 tall and a
 * `Preview` square under it opening at y=56.
 *
 * ── The header is PINNED, and the square is what scrolls ─────────────────────
 * Figma cannot draw stickiness: a pinned header and a scrolling one look the
 * same in a still frame. The owner decided it (divergences row 94), by analogy
 * with the left column, whose footer the sticker pins in so many words.
 *
 * The kit does leave one trace of it, and it lines up: on the short frame
 * `5395:119983` the right column's scrollbar `5396:120156` starts at y=88 of
 * the panel — 32 padding + 32 header + 24 gap, i.e. exactly the top edge of the
 * square. A bar for a column that scrolled as a whole would start at the top of
 * the column, not under its header.
 *
 * ── Why the gutter lives in the padding and not in the square ────────────────
 * The same frame puts the bar at x=1690 in a 1700 container: 4 in from the
 * pane's own edge and 22 clear of the square, i.e. floating in the panel's 32
 * padding. So the scroll area spans the pane edge to edge and carries the
 * horizontal padding itself — 32 on the left, 22 on the right plus the 10 the
 * bar reserves. Put the padding on the pane instead and the reserved gutter
 * comes out of the square, which is how the square ended up 10 narrower than it
 * was tall.
 */

/**
 * Gap between the header and the square — kit `spacing/24` on `Content`.
 * Measured on the drawn review `I5387:91948;3839:9515` (header 0–32, preview at
 * 56) and on all four responsive frames (`I5395:118764;3717:1809` and siblings).
 *
 * It was 80, set when the right column scaled with the Admin panel and the
 * number was eyeballed rather than read off a node. Divergences row 51.
 */
export const MOBILE_PHONE_PREVIEW_TITLE_GAP_CLASS = 'gap-6'

/**
 * Height the skeletons reserve for the header while the name is unknown —
 * the kit's 32, so the square below it opens in the same place as it will
 * once the real header arrives. Was 56, which is header + gap, counted twice.
 */
export const PREVIEW_HEADER_RESERVE_CLASS = 'h-8'

/**
 * Root of every component that renders into the shell's `right` slot: a column
 * of exactly two children — the header and the scroll area — at the kit's 24.
 * `min-h-0` is what lets the scroll area shrink below its content instead of
 * pushing the header off the top.
 */
export const PREVIEW_PANEL_ROOT_CLASS = `flex h-full min-h-0 flex-col ${MOBILE_PHONE_PREVIEW_TITLE_GAP_CLASS}`

/**
 * The header row. 32 tall and `shrink-0`: it is the 24/32 name line and nothing
 * else, and the square below must never squeeze it. `px-8` is the pane's own
 * `spacing/32` — it lives here rather than on the pane so that the scroll area
 * beside it can reach the pane edge (see the file header).
 */
export const PREVIEW_PANEL_HEADER_CLASS = 'flex h-8 shrink-0 items-center px-8'

/** `spacing/8` between the glyph or the name and what follows it. */
export const PREVIEW_PANEL_HEADER_GAP_CLASS = 'gap-2'

/**
 * The scroll area — the only thing in the column that moves. Spans the pane
 * edge to edge and carries the pane's own `spacing/32` on both sides, so the
 * square inside is exactly `--wizard-preview-side` wide: 639 − 64 = 575 at
 * 1440, and the same subtraction at every other breakpoint.
 *
 * **Not 32 / 22.** The first version of this file gave the right side 22 and
 * expected `scrollbar-gutter: stable` to hand back the other 10 for the drawn
 * bar. That gutter is zero whenever the browser uses OVERLAY scrollbars — the
 * macOS default, and the machine this is reviewed on — so the content came out
 * 10 too WIDE and the square stopped being square again, in the other
 * direction this time. The same mistake was already costing the left column
 * its card sizes; see `LEFT_PANE_SCROLL_GUTTER_CLASS`. The bar overlays the
 * padding, which is what the kit draws: `5396:120156` sits 4 in from the
 * pane's edge, not beside the square.
 */
export const PREVIEW_PANEL_SCROLL_CLASS =
  'wizard-scrollbar min-h-0 flex-1 overflow-y-auto px-8'

/**
 * The square. Its height is the side the shell measured, published as
 * `--wizard-preview-side`; it is a DEFINITE height, which is the whole point —
 * every preview box in the tree used to be `flex-1` and squashed instead of
 * overflowing, so the column was sized by a number that was not inside it.
 * The fallback keeps the drawer (narrow embed) filling its overlay as before.
 */
export const PREVIEW_PANEL_SQUARE_CLASS = 'wizard-preview-square w-full'

/** `radius/concept-preview` 24 — on the square in all three types. */
export const PREVIEW_PANEL_SQUARE_RADIUS_CLASS = 'rounded-[24px]'

/**
 * The concept name and the «Превʼю» title — kit `header/l` 24/32 weight 500 on
 * `preview panel/content/title` #1f1f2e, letter-spacing 0.
 */
export const PREVIEW_PANEL_TITLE_CLASS = 'text-2xl font-medium leading-8 text-ink-900'

/** The glyph beside that title — 24 on `preview panel/content/icon` #6f6f7d. */
export const PREVIEW_PANEL_ICON_CLASS = 'size-6 shrink-0 text-ink-700'

/**
 * `Type=Placeholder` `4492:11680`: `#f9f9fb` inside a SOLID 1px `#eaeaeb`,
 * radius 24, contents centred. The dashed `rgba(0,0,0,0.1)` that stood here is
 * in no kit section.
 */
export const PREVIEW_PANEL_PLACEHOLDER_CLASS =
  'flex flex-col items-center justify-center overflow-hidden border border-ink-300 bg-ink-100 p-5 text-center'

/** `Container` inside it: a 200-wide column at `spacing/16`. */
export const PREVIEW_PANEL_PLACEHOLDER_BODY_CLASS = 'flex w-[200px] flex-col items-center gap-4'

/** Its glyph — `ImageSquare` Regular at 40 on `preview panel/placeholder/icon` #95959d. */
export const PREVIEW_PANEL_PLACEHOLDER_ICON_CLASS = 'size-10 text-ink-600'

/**
 * Its copy — `body/regular` 16/24 on `preview panel/placeholder/text` #6f6f7d,
 * centred, letter-spacing 0.
 */
export const PREVIEW_PANEL_PLACEHOLDER_TEXT_CLASS = 'w-full text-base leading-6 text-ink-700'

/** The sentence the kit writes in that box, `4492:11745`, trailing stop and all. */
export const PREVIEW_PANEL_PLACEHOLDER_TEXT = 'Оберіть концепт зліва, щоб переглянути превʼю.'

/**
 * Where the phone stands inside the square: `spacing/24` down from its top
 * edge, centred across. Measured on both screens that draw one — step 7
 * `5382:64270` puts its 239.18×520 phone at y=24, and the step-8 review
 * `5387:91948` puts both of its phones at y=24 as well. Step 7 used to centre
 * the phone vertically and the review used to pin it to y=0.
 */
export const PREVIEW_PANEL_PHONE_ROW_CLASS = 'flex h-full w-full items-start justify-center pt-6'

/**
 * ── How a concept picture sits in the square — DP-15450, both HIGH rows ──────
 *
 * The designer wrote the same sentence on two screens: «Зберігати фіксовані
 * пропорції preview без crop.» Which shape a picture gets is decided by
 * `composables/useAdaptiveImageFit.ts`; these three are the classes that decide
 * carries, and they live here because **two components draw this same square
 * and they had drifted apart.**
 *
 * `ConceptPreviewSlider` (step 2) asked the composable and honoured the answer.
 * `ConceptMobilePreview` — the square on the naming steps, the final review and
 * the CEO's screen — did not ask at all: it filled the square unconditionally,
 * which is exactly the second HIGH row. One picture, one rule, one place.
 *
 * The backdrop is what fills the space left over when a picture is shown whole:
 * an enlarged, blurred, darkened copy of the picture itself, so the panel never
 * shows a bare plate. It was already in the slider; the review square had
 * nothing.
 */

/** The picture itself — fills the square's box; the fit class decides the rest. */
export const PREVIEW_IMAGE_CLASS = 'absolute inset-0 h-full w-full'

/**
 * The blurred copy behind it. `scale-110` hides the blur's own soft edge,
 * `brightness-[0.7]` keeps it from competing with the picture in front.
 * Always filled, never shown whole — it is a backdrop, not content.
 */
export const PREVIEW_IMAGE_BACKDROP_CLASS =
  'absolute inset-0 h-full w-full scale-110 object-cover blur-2xl brightness-[0.7]'

/** The one place the fit decision becomes a class. */
export function previewImageFitClass(fit: 'cover' | 'contain'): string {
  return fit === 'contain' ? 'object-contain' : 'object-cover'
}

/**
 * ── The concept-gallery DRAWER, and why its box is NOT the kit's square ──────
 *
 * The drawer is `ConceptPreviewPopup`: the panel that slides in over the right
 * column when the eye beside a concept is pressed on the final review. It is
 * not a screen the designer drew — the board carries five mock-ups and none of
 * them is this one, and the kit's `Preview panel` `3839:9513` knows three types,
 * all of them a header above a square. So the shape of this box is ours.
 *
 * **What it used to be, measured off the owner's screenshots:** the box was
 * handed whatever height was left in a full-height panel — 591 × 780 at a
 * 1440 × 900 window — while the pictures are SQUARE. A square picture shown
 * whole in a 780-tall box leaves (780 − 591) ÷ 2 = 94.5 of blurred backdrop
 * above it and the same below. Nothing was broken; the box simply had no shape.
 *
 * **What it is now (the owner's call, variant B):** the box takes the
 * proportion of the picture inside it, so there is nothing left over to fill.
 * For the square gallery pictures that IS a square — and a square is what every
 * other place in the product already draws: `aspect-ratio: 1` on the Admin's
 * concept cards and `aspect-square` on the wizard's.
 *
 * **Why the pictures are square is not an assumption.** The gallery slots
 * upload with `aspect_ratio` 1:1 and the worker refuses anything off by more
 * than 1% (`packages/worker/src/utils/asset-validation.ts`). The proportion is
 * still read from the decoded picture rather than assumed, because a box that
 * follows the picture cannot be wrong about it, and old assets predate that
 * check.
 *
 * **Why the wizard's square is left alone.** There the number is the designer's
 * (575 at 1440) and the whole column is sized from it — the responsive section
 * publishes it as `--wizard-preview-side`. Under the drawer's box there is
 * nothing at all, which is exactly why the box may follow the picture here and
 * nowhere else.
 */

/**
 * The area the drawer gives its box: the leftover height, with the box centred
 * in whatever it does not use.
 */
export const PREVIEW_DRAWER_AREA_CLASS =
  'flex min-h-0 flex-1 items-center justify-center overflow-hidden'

/**
 * The box itself. `w-full` + `max-h-full` + an inline `aspect-ratio` is the fit
 * pattern Tailwind's own aspect utilities rely on: a max size on one axis is
 * transferred through the ratio to the other (CSS Sizing 4), so a box too tall
 * for the area gives up width instead of breaking its shape.
 */
export const PREVIEW_DRAWER_BOX_CLASS = 'w-full max-h-full'

/** The empty state keeps the whole area — there is no picture to take a shape from. */
export const PREVIEW_DRAWER_PLACEHOLDER_BOX_CLASS = 'h-full w-full'

/** Used until the picture has decoded: square, which is what the uploads are. */
export const PREVIEW_BOX_ASPECT_FALLBACK = 1

/**
 * How far from square the box is allowed to follow a picture. A panorama or a
 * strip uploaded before the 1:1 check existed would otherwise collapse the box
 * to a sliver, and the arrows and dots inside it stand 48 tall on a 20 inset.
 * At 2.5 the box is still 236 tall at a 591 width.
 */
export const PREVIEW_BOX_ASPECT_MIN = 0.4
export const PREVIEW_BOX_ASPECT_MAX = 2.5

/**
 * The drawer's box shape, as arithmetic — pinned by
 * `tests/unit/composables/adaptiveImageFit.test.ts` for the same reason
 * `resolveImageFit` is: a composable with a `ResizeObserver` cannot be mounted
 * in this package's node test environment.
 */
export function resolvePreviewBoxAspect(imageAspect: number | null | undefined): number {
  if (!imageAspect || !Number.isFinite(imageAspect) || imageAspect <= 0) {
    return PREVIEW_BOX_ASPECT_FALLBACK
  }
  return Math.min(PREVIEW_BOX_ASPECT_MAX, Math.max(PREVIEW_BOX_ASPECT_MIN, imageAspect))
}
