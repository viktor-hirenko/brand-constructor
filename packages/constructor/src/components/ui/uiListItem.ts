/**
 * Class map for `UiListItem.vue` and `UiPopover.vue`.
 *
 * Kit source: Figma section Dropdown `3446:5148`, two of its frames:
 *   List item `3446:5054` — State = Default / Hovered / Selected / Disabled
 *   Popover   `3446:5235` — the floating surface the list sits on
 * https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=3446-5054&m=dev
 *
 * The rest of that section — Dropdown `3446:5801`, List `3446:5113`, Header
 * `3446:5102` — is NOT built as components. The plan calls the full set
 * overkill, and the measurement agrees: `get_variable_defs` on the Dropdown
 * returns the Input tokens verbatim plus these list tokens, i.e. a Dropdown IS
 * an Input surface with a Popover under it. The two call sites that need one
 * (the date trigger, the GEO trigger) get the Input surface from `uiField.ts`
 * and the list from here, and no third recipe is minted. The Header is one
 * string of classes with one carrier, so it lives on `UiPopover` as a slot
 * rather than as a file.
 *
 * ── Measured, not guessed
 *
 * `get_metadata 3446:5053` (State = Default): symbol 297×40, Icon left 16×16 at
 * x=8 y=12, Label frame at x=24 holding its text at x=4. So:
 *   height 40 = 12 + 16 + 12          → `py-3` on a 14/16 line
 *   inset  8                          → `px-2`
 *   text   28 with a glyph, 12 without → the label carries its own `px-1`
 * and 12 is exactly where the Header sets its text too (`3446:5102`, text at
 * x=12 y=8 in a 32-tall box), so the two line up.
 *
 * `get_variable_defs 3446:5054`:
 *   radius/input-list-item            4        → `rounded-sm`
 *   input/list/item/bg/hovered        #f9f9fb  → ink-100 (added in phase 11)
 *   input/list/item/bg/selected       #f3f3f5  → ink-200
 *   input/list/item/content/primary   #1f1f2e  → ink-900
 *   input/list/item/content/secondary #6f6f7d  → ink-700
 *   caption/l/regular                 14 / 16  → `text-sm/4`
 *   opacity/50                                 → the Disabled state
 *
 * `get_variable_defs 3446:5235` (Popover):
 *   radius/input-list  8        → `rounded-lg`
 *   input/list/bg      #ffffff
 *   input/list/border  #f3f3f5  → ink-200
 *   spacing/4          4        → `p-1`
 *   input/list/header  #95959d  → ink-600, caption l MEDIUM 14/16
 *
 * Why a `.ts` map and not a component test: `packages/constructor` has no
 * `@vue/test-utils` and no `jsdom` (`vitest.config.ts:11` sets
 * `environment: 'node'`), so the class decision is a pure function. Same idiom
 * as `ui/uiButton.ts`, `ui/uiBadge.ts`, `ui/uiLink.ts`, `ui/uiField.ts`.
 *
 * Every length is a rem-based Tailwind utility — "Железные правила адаптива".
 */

export interface UiListItemOptions {
  /** Kit State = Selected. */
  selected?: boolean
  /** Kit State = Disabled — `opacity/50`, no hover. */
  disabled?: boolean
}

/**
 * `w-full` and `text-left` are ours: the kit draws a fixed-width symbol, and a
 * `<button>` centres its text by default. Everything else is measured above.
 */
export const UI_LIST_ITEM_BASE_CLASS =
  'ui-list-item flex w-full items-center rounded-sm px-2 py-3 text-left text-sm/4 text-ink-900 transition-colors'

/** State = Hovered — `input/list/item/bg/hovered` #f9f9fb. */
export const UI_LIST_ITEM_INTERACTIVE_CLASS =
  'hover:bg-ink-100 focus-visible:outline-none focus-visible:bg-ink-100'

/** State = Selected — `input/list/item/bg/selected` #f3f3f5. */
export const UI_LIST_ITEM_SELECTED_CLASS = 'ui-list-item--selected bg-ink-200'

/** State = Disabled — `opacity/50`, the same fade Button and Input take. */
export const UI_LIST_ITEM_DISABLED_CLASS =
  'ui-list-item--disabled cursor-not-allowed opacity-50'

/** Icon left slot: 16×16, flush at the 8 inset. */
export const UI_LIST_ITEM_ICON_CLASS = 'ui-list-item__icon size-4 shrink-0'

/**
 * The Label frame. Its own 4 of padding is what puts the text at 12 with no
 * glyph and at 28 with one — the kit sets the gap between Icon left and the
 * Label frame to zero and insets the text instead.
 */
export const UI_LIST_ITEM_LABEL_CLASS = 'ui-list-item__label min-w-0 flex-1 px-1'

/** `input/list/item/content/secondary` #6f6f7d — the muted half of a label. */
export const UI_LIST_ITEM_SECONDARY_CLASS = 'ui-list-item__secondary text-ink-700'

/**
 * Popover surface. The kit gives it no shadow — it draws the symbol flat on the
 * canvas — but a popover that floats over content needs one or it reads as part
 * of the page. This is the two-layer shadow the brief-order dropdown already
 * carried, kept as the single popover shadow rather than inventing a third.
 */
export const UI_POPOVER_CLASS =
  'ui-popover rounded-lg border border-ink-200 bg-white p-1 shadow-[0px_10px_38px_-10px_rgba(22,23,24,0.35),0px_10px_20px_-15px_rgba(22,23,24,0.2)]'

/** Kit Header `3446:5102`: 32 tall, text at 12/8, caption l MEDIUM in #95959d. */
export const UI_POPOVER_HEADER_CLASS =
  'ui-popover__header px-3 py-2 text-sm/4 font-medium text-ink-600'

export function resolveUiListItemClasses(options: UiListItemOptions = {}): string {
  const { selected = false, disabled = false } = options

  return [
    UI_LIST_ITEM_BASE_CLASS,
    selected ? UI_LIST_ITEM_SELECTED_CLASS : '',
    disabled ? UI_LIST_ITEM_DISABLED_CLASS : UI_LIST_ITEM_INTERACTIVE_CLASS,
  ]
    .filter(Boolean)
    .join(' ')
}
