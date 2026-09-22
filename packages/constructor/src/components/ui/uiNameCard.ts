/**
 * Class map for `UiNameCard.vue`, for the grid that lays those cards out, and —
 * this is the point of the file — for
 * `skeletons/InternalNamingGridSkeleton.vue`.
 *
 * Kit source: Figma `3719:5978` (section `Name card` `4064:7064`), three
 * symbols, all 510×76: State = Default `3719:5979`, Hovered `3719:5994`,
 * Selected `3719:5777`.
 * https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=3719-5978&m=dev
 *
 * ── The card is 64 on step 4, not the kit frame's 76 ─────────────────────────
 * 76 is the height with the domain line switched on. Step 4 hides the domain,
 * the price and the badge, and then the checkbox is the tallest thing in the
 * row: 16 + 32 + 16 = **64**. Measured on both canvases, not derived —
 *
 *   old canvas `4071:7486` : eight instances, each 246×64, columns at x 0 and
 *                            254 (gap 8), rows on a 72 pitch (gap 8)
 *   new canvas `5387:104658`: six instances, each 259.5×64 in a 527 container,
 *                            columns at x 0 and 267.5 (gap 8), same 72 pitch
 *
 * and inside one instance (`4071:7776`, `5387:105124` — identical):
 *
 *   checkbox  32×32 at (16, 16)          → padding 16, gap 16
 *   name      x=64, y=20, height 24      → `header/m` 20/24 weight 500
 *   (test.com) / $1 000 / Badge          → hidden="true" on step 4
 *
 * ── Two columns are fixed here, and that is a deliberate divergence ──────────
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
 * The grid — shared with the skeleton
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Two equal columns, `gap-2` (8) in both axes — the 8 measured between columns
 * (254 − 246) and between rows (72 − 64) on the drawn screen.
 *
 * `minmax(0,1fr)` is what keeps a long name from pushing the track wider than
 * the container; the cards truncate instead.
 */
export const UI_NAME_CARD_GRID_CLASS =
  'ui-name-card-grid grid gap-2 [grid-template-columns:repeat(2,minmax(0,1fr))]'

/* ────────────────────────────────────────────────────────────────────────────
 * The card — kit `3719:5978`
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * 64 tall (`h-16`), `spacing/16` left and right, `spacing/16` between the
 * checkbox and the name, `radius/concept-card` 16, `name card/bg` #ffffff.
 *
 * There is no `box-border` here and no `border` either: the outline is an inset
 * ring (see above), which is painted inside the box without taking part in the
 * box model at all. `w-full` because the grid track decides the width, never
 * the card.
 */
export const UI_NAME_CARD_BASE_CLASS =
  'ui-name-card flex h-16 w-full items-center gap-4 rounded-2xl bg-white px-4 text-left transition-shadow'

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
 * `header/m` 20/24 weight 500 in `name card/content/primary` #1f1f2e.
 * Tailwind's bare `text-xl` is 20/28; `/6` is how this tree spells the kit's
 * line height (`text-sm/4`, `text-lg/6` elsewhere).
 *
 * The kit fixes the card at 64, so a name that does not fit truncates rather
 * than growing the row — the drawn card gives the text exactly one 24 line box.
 */
export const UI_NAME_CARD_NAME_CLASS =
  'ui-name-card__name min-w-0 flex-1 truncate text-xl/6 font-medium text-ink-900'

/**
 * The name's line box, for carriers that have no text to derive it from — the
 * skeleton's placeholder bar. It cannot be shared as the same class the name
 * uses (a grey bar has no line box), so it is shared as a number and guarded by
 * a test, exactly like `UI_ACCORDION_HEADER_CONTENT_HEIGHT_CLASS`.
 */
export const UI_NAME_CARD_NAME_HEIGHT_CLASS = 'h-6'

export interface UiNameCardOptions {
  selected?: boolean
  disabled?: boolean
}

export function resolveUiNameCardClasses(options: UiNameCardOptions = {}): string {
  const { selected = false, disabled = false } = options

  return [
    UI_NAME_CARD_BASE_CLASS,
    selected ? UI_NAME_CARD_SELECTED_CLASS : UI_NAME_CARD_DEFAULT_CLASS,
    disabled
      ? UI_NAME_CARD_DISABLED_CLASS
      : selected
        ? UI_NAME_CARD_INTERACTIVE_CLASS
        : `${UI_NAME_CARD_INTERACTIVE_CLASS} ${UI_NAME_CARD_HOVER_CLASS}`,
  ].join(' ')
}
