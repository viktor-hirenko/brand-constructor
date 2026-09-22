/**
 * Class map for `UiNameCard.vue`, for the two layouts that lay those cards out,
 * and — this is the point of the file — for the three skeletons that have to
 * match them pixel for pixel.
 *
 * Kit source: Figma `3719:5978` (section `Name card` `4064:7064`), three
 * symbols, all 510×76: State = Default `3719:5979`, Hovered `3719:5994`,
 * Selected `3719:5777`.
 * https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=3719-5978&m=dev
 *
 * ── One card, two heights: 64 on step 4, 76 on step 3 ───────────────────────
 * 76 is the height with the domain line switched on. Step 4 hides the domain,
 * the price and the badge, and then the checkbox is the tallest thing in the
 * row: 16 + 32 + 16 = **64**. Step 3 switches all three back on and the text
 * column becomes 24 + 4 + 16 = 44, so the card is 16 + 44 + 16 = **76**.
 * Measured on all four canvases, not derived —
 *
 *   step 4, old `4071:7486`  : eight instances, each 246×64, columns at x 0 and
 *                              254 (gap 8), rows on a 72 pitch (gap 8)
 *   step 4, new `5387:104658`: six instances, each 259.5×64 in a 527 container,
 *                              columns at x 0 and 267.5 (gap 8), same 72 pitch
 *   step 3, old `4071:7082`  : five instances, each **500×76**, ONE column at
 *                              x 0, rows on an **84 pitch** (76 + gap 8)
 *   step 3, new `5382:37529` : five instances, each **527×76**, one column,
 *                              same 84 pitch — and the edit flow draws the same
 *                              list again on `5395:107506`
 *
 * and inside one step 3 instance (`4071:7400`, `3719:5979` — identical bar the
 * width the text column absorbs):
 *
 *   checkbox    32×32 at (16, 22)        → padding 16, gap 16
 *   Text        x=64,  y=16, 44 tall     → fills the row
 *     Name      y=0,  24 tall            → `header/m` 20/24 weight 500
 *     (test.com) y=28, 16 tall           → `caption/m` 12/16 weight 400, gap 4
 *   Price+Badge x=344, y=26, **140**×24  → fixed block, flush with the 16 pad
 *     $1 000    x=0, fills               → `body/medium` 16/24 weight 500
 *     Badge     x=72 → right edge 140    → gap 16, `radius/badge` 1000
 *
 * The 140 block is the same in every instance: the badge is pinned to the right
 * edge and the price takes what is left (56 next to «Available», 82 next to the
 * narrower «Sold»), so prices line up down the list and so do badges.
 *
 * ── Two columns on step 4, one on step 3 — both fixed, both deliberate ───────
 * Every other selection grid in this tree uses
 * `repeat(auto-fill, minmax(min(9rem,100%),1fr))` — the named invariant in
 * "Железные правила адаптива". A row card is not a 144 tile: at our real
 * container widths that formula lands on 1 or 3 columns, never the 2 the
 * designer drew (standalone gives the step panel ≈509 of content, where two
 * 16rem tracks plus the gap need 520). The mockup fixes the count, so the count
 * is fixed.
 *
 * What the invariant actually protects is kept: `minmax(0,1fr)` still cannot
 * overflow a narrow container, and the density is still a single constant
 * shared by the grid and its skeleton — it is shared here as the same string,
 * which is stronger than sharing the number. Written up as a new row in
 * `dp-15258-divergences.md`.
 *
 * Step 3 is drawn one card per row at the full container width on both
 * canvases, so it is not a grid at all: `UI_NAME_CARD_LIST_CLASS` is a plain
 * column with the same 8 gap. Nothing there can overflow either — a flex column
 * item is `stretch` by default and the text inside truncates.
 *
 * ── Border widths, and why they are not `border` ─────────────────────────────
 * Default and Hovered stroke 1px (#eaeaeb / #6f6f7d), Selected strokes **2px**
 * #030213 — read off the three exports, not off the token names:
 *
 *   Default   <path d="M16 0.5H494…" stroke="#EAEAEB"/>
 *   Hovered   <path d="M16 0.5H494…" stroke="#6F6F7D"/>
 *   Selected  <path d="M16 1H494…"  stroke="#030213" stroke-width="2"/>
 *
 * Figma strokes inside, so the checkbox sits at (16, 22) in Default AND in
 * Selected — picking a name moves nothing. A CSS `border` going 1px → 2px
 * would move the whole row's content by a pixel, so the outline is drawn with
 * `inset-ring-*` (Tailwind v4 mints `box-shadow: inset 0 0 0 Npx …`), which has
 * no layout effect at all. Phase 12 solved the same problem with a transparent
 * border because there both states were 1px; here the widths differ.
 *
 * The 1px/2px stay in px on purpose: "Железные правила адаптива" keeps hairline
 * borders out of the rem scale, because at a 11px root `0.0625rem` renders as
 * 0.69px — grey mush instead of a line.
 *
 * ── Letter-spacing is the kit's zero ─────────────────────────────────────────
 * Open question 7 keeps the current tracking on вынос screens and drops it on
 * redesign screens. This is a redesign screen (part II of the plan), and all
 * five kit type styles set `letterSpacing: 0`, so the `-0.1504px` the tiles
 * carried is gone.
 *
 * Why a `.ts` map and not a component test: `packages/constructor` has no
 * `@vue/test-utils` and no `jsdom`, and `vitest.config.ts:11` sets
 * `environment: 'node'` — mounting is impossible here, so the class decision is
 * a pure function and the markup stays under manual acceptance on prod. Same
 * idiom as `ui/uiAccordion.ts` and `ui/uiToggle.ts`.
 */

/* ────────────────────────────────────────────────────────────────────────────
 * The two layouts — each shared with its skeleton
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Step 4: two equal columns, `gap-2` (8) in both axes — the 8 measured between
 * columns (254 − 246) and between rows (72 − 64) on the drawn screen.
 *
 * `minmax(0,1fr)` is what keeps a long name from pushing the track wider than
 * the container; the cards truncate instead.
 */
export const UI_NAME_CARD_GRID_CLASS =
  'ui-name-card-grid grid gap-2 [grid-template-columns:repeat(2,minmax(0,1fr))]'

/**
 * Step 3: one card per row at the container's full width, `gap-2` (8) — the 8
 * measured as the 84 row pitch minus the 76 card on `4071:7082`, `5382:37529`
 * and `5395:107506`.
 */
export const UI_NAME_CARD_LIST_CLASS = 'ui-name-card-list flex flex-col gap-2'

/* ────────────────────────────────────────────────────────────────────────────
 * The card — kit `3719:5978`
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * `spacing/16` left and right, `spacing/16` between the checkbox and the text,
 * `radius/concept-card` 16, `name card/bg` #ffffff. The height is not here — it
 * is one of the two constants below, because the same card is 64 on step 4 and
 * 76 on step 3.
 *
 * There is no `box-border` here and no `border` either: the outline is an inset
 * ring (see above), which is painted inside the box without taking part in the
 * box model at all. `w-full` because the track or the column decides the width,
 * never the card.
 */
export const UI_NAME_CARD_BASE_CLASS =
  'ui-name-card flex w-full items-center gap-4 rounded-2xl bg-white px-4 text-left transition-shadow'

/** Step 4 — name only: 16 + 32 (the checkbox is the tallest thing) + 16. */
export const UI_NAME_CARD_COMPACT_HEIGHT_CLASS = 'h-16'

/** Step 3 — name over domain: 16 + (24 + 4 + 16) + 16. */
export const UI_NAME_CARD_DETAILED_HEIGHT_CLASS = 'h-19'

/** State = Default — `name card/border/default` #eaeaeb, 1px. */
export const UI_NAME_CARD_DEFAULT_CLASS = 'inset-ring-1 inset-ring-ink-300'

/** State = Hovered — `name card/border/hovered` #6f6f7d, still 1px. */
export const UI_NAME_CARD_HOVER_CLASS = 'hover:inset-ring-ink-700'

/** State = Selected — `name card/border/accent` #030213 at 2px. */
export const UI_NAME_CARD_SELECTED_CLASS =
  'ui-name-card--selected inset-ring-2 inset-ring-primary'

/**
 * The kit has no Disabled for this card. `opacity/50` is what Button, Input,
 * List item and the accordion all use for it, so the same value is used here
 * rather than a new one invented; the tiles this replaces used 40.
 */
export const UI_NAME_CARD_DISABLED_CLASS = 'ui-name-card--disabled cursor-not-allowed opacity-50'

/** Only the enabled card is clickable; `cursor-pointer` follows that. */
export const UI_NAME_CARD_INTERACTIVE_CLASS = 'cursor-pointer'

/**
 * Read-only: the same card with nothing to click.
 *
 * The alternative flow shows the customer's own pick above the list
 * («Вибір замовника»), and the designer draws it as this very card in State =
 * Default — white, `name card/border/default` #eaeaeb, the circle empty
 * (`5387:105118` returns `checkbox/border`, not `checkbox/bg/default`). It is a
 * display, not a control, so it gets no hover, no pointer and no tab stop.
 */
export const UI_NAME_CARD_READONLY_CLASS = 'ui-name-card--readonly'

/**
 * The `Text` frame: the name, and under it the domain at `spacing/4`. It takes
 * whatever width the checkbox and the 140 meta block leave (`flex-1`), and
 * `min-w-0` is what lets its children truncate instead of widening the row.
 */
export const UI_NAME_CARD_TEXT_CLASS = 'ui-name-card__text flex min-w-0 flex-1 flex-col gap-1'

/**
 * `header/m` 20/24 weight 500 in `name card/content/primary` #1f1f2e.
 * Tailwind's bare `text-xl` is 20/28; `/6` is how this tree spells the kit's
 * line height (`text-sm/4`, `text-lg/6` elsewhere).
 *
 * The card's height is fixed, so a name that does not fit truncates rather than
 * growing the row — the drawn card gives the text exactly one 24 line box.
 */
export const UI_NAME_CARD_NAME_CLASS =
  'ui-name-card__name truncate text-xl/6 font-medium text-ink-900'

/**
 * The name's line box, for carriers that have no text to derive it from — the
 * skeletons' placeholder bars. It cannot be shared as the same class the name
 * uses (a grey bar has no line box), so it is shared as a number and guarded by
 * a test, exactly like `UI_ACCORDION_HEADER_CONTENT_HEIGHT_CLASS`.
 */
export const UI_NAME_CARD_NAME_HEIGHT_CLASS = 'h-6'

/**
 * `(test.com)` — `caption/m/regular` 12/16 weight 400 in
 * `name card/content/secondary` #393947, which is `--color-ink-800`.
 *
 * Read off the Default export (`fill="#393947"`), not off a token name. The
 * tiles this replaces painted the domain #4b4b58, a colour the kit does not
 * contain at all.
 */
export const UI_NAME_CARD_DOMAIN_CLASS = 'ui-name-card__domain truncate text-xs/4 text-ink-800'

/** The domain's 16 line box, for the skeletons — same reason as the name's. */
export const UI_NAME_CARD_DOMAIN_HEIGHT_CLASS = 'h-4'

/**
 * The `Price + Badge` frame: 140 wide (`w-35` = 8.75rem), fixed on every
 * instance, with `spacing/16` between the two. Fixing it is what lines the
 * prices and the badges up down the list even though «Available» and «Sold»
 * are different widths — see the header of this file.
 */
export const UI_NAME_CARD_META_CLASS = 'ui-name-card__meta flex w-35 shrink-0 items-center gap-4'

/**
 * `$1 000` — `body/medium` 16/24 weight 500 in `name card/content/primary`
 * #1f1f2e (`fill="#1F1F2E"` on the export, the same slot as the name).
 *
 * It fills what the badge leaves, so the badge stays flush with the card's
 * right padding whether or not a price exists.
 */
export const UI_NAME_CARD_PRICE_CLASS =
  'ui-name-card__price min-w-0 flex-1 truncate text-base/6 font-medium text-ink-900'

/** The price's 24 line box, for the skeletons. */
export const UI_NAME_CARD_PRICE_HEIGHT_CLASS = 'h-6'

/**
 * The badge instance is 68×24 in the kit (`Available`; `Sold` measures 42).
 * Only the skeleton needs a width — the real badge is `UiBadge`, which sizes
 * itself from its label.
 */
export const UI_NAME_CARD_BADGE_SKELETON_CLASS = 'h-6 w-17 rounded-full'

export interface UiNameCardOptions {
  selected?: boolean
  disabled?: boolean
  /** A display of someone else's pick — no click, no hover, no tab stop. */
  readonly?: boolean
  /** Step 3: the domain, price and badge slots are on, so the card is 76. */
  detailed?: boolean
}

export function resolveUiNameCardClasses(options: UiNameCardOptions = {}): string {
  const { selected = false, disabled = false, readonly = false, detailed = false } = options

  const outline = selected ? UI_NAME_CARD_SELECTED_CLASS : UI_NAME_CARD_DEFAULT_CLASS
  const height = detailed ? UI_NAME_CARD_DETAILED_HEIGHT_CLASS : UI_NAME_CARD_COMPACT_HEIGHT_CLASS
  const box = `${UI_NAME_CARD_BASE_CLASS} ${height}`

  if (readonly) {
    return `${box} ${outline} ${UI_NAME_CARD_READONLY_CLASS}`
  }

  return [
    box,
    outline,
    disabled
      ? UI_NAME_CARD_DISABLED_CLASS
      : selected
        ? UI_NAME_CARD_INTERACTIVE_CLASS
        : `${UI_NAME_CARD_INTERACTIVE_CLASS} ${UI_NAME_CARD_HOVER_CLASS}`,
  ].join(' ')
}

/* ────────────────────────────────────────────────────────────────────────────
 * The two things the card renders that are not a class
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * `$1 000` — the format the kit writes and the format both naming screens
 * already used, lifted here so the card owns it once instead of two call sites
 * owning a copy each. Byte for byte the old function, including the comma
 * replacement: `uk-UA` groups with U+00A0, but a runtime built without full ICU
 * falls back to en-US and would print `$1,500`, so the swap stays.
 */
export function formatUiNameCardPrice(price: number | null | undefined): string {
  if (price === null || price === undefined || !Number.isFinite(price)) return ''
  return `$${price.toLocaleString('uk-UA').replace(/,/g, ' ')}`
}

/**
 * Availability → kit badge. `5382:46492` paints Available with
 * `badge/bg/green` + `badge/content/green` and `5382:48314` paints Sold with
 * `badge/bg/red` + `badge/content/red`; `unknown` is drawn nowhere, so it gets
 * no badge rather than an invented one.
 */
export interface UiNameCardBadge {
  tone: 'green' | 'red'
  label: string
}

export function resolveUiNameCardBadge(
  availability: string | null | undefined
): UiNameCardBadge | null {
  if (availability === 'available') return { tone: 'green', label: 'Available' }
  if (availability === 'sold') return { tone: 'red', label: 'Sold' }
  return null
}
