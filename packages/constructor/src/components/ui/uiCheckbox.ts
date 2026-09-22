/**
 * Class map for `UiCheckbox.vue`.
 *
 * Kit source: Figma `3764:5499` — State = Selected (`3719:5718`) / Unselected
 * (`3764:5500`). Those two symbols are the whole kit: no Hovered, no Disabled.
 * https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=3764-5499&m=dev
 *
 * ── Measured off the export, not read off a token name ───────────────────────
 * Both symbols export at 32×32 and the shape is a CIRCLE, not a rounded square
 * (`radius/control` is 1000):
 *
 *   Unselected  <path d="M16 0.5C24.56 0.5 31.5 7.44 31.5 16 …" stroke="#EAEAEB"/>
 *               → a 1px inside stroke, no fill at all
 *   Selected    <path d="M16 38C16 29.16 …" fill="#030213"/> plus the Phosphor
 *               `Check` glyph in `fill="white"` on a 16 box centred in the 32
 *
 * The glyph is the same one `icons/CheckIcon.vue` carries after phase 23:
 * multiply the kit's 16-box coordinates by 1.5 and they land on our 24-box path
 * point for point ((22.3538 − 8) × 1.5 = 21.53, (12.8538 − 8) × 1.5 = 7.28).
 *
 * Colours come from those `fill`/`stroke` values, not from the token list:
 * #030213 is `--color-primary`, #eaeaeb is `--color-ink-300`, the tick is white.
 * No hex appears below.
 *
 * ── Why the border colour changes instead of appearing ───────────────────────
 * The kit draws a stroke on Unselected and none on Selected. Written literally
 * that is `border` on one state and no border on the other, which moves the
 * tick by a pixel the moment a name is picked. Selected therefore keeps the
 * border and paints it the same #030213 as the fill — identical on screen,
 * and the box stays 32 in both states.
 *
 * ── Presentational on purpose ────────────────────────────────────────────────
 * Every call site so far (`UiNameCard`) puts this inside a row that is itself a
 * `<button>`. A control inside a control is invalid HTML and would swallow the
 * row's click, so this primitive renders a `<span aria-hidden>` and owns no
 * state — the same call phase 14 made for the step 7 toggle (`decorative`).
 *
 * Why a `.ts` map and not a component test: `packages/constructor` has no
 * `@vue/test-utils` and no `jsdom`, and `vitest.config.ts:11` sets
 * `environment: 'node'` — mounting is impossible here, so the class decision is
 * a pure function. Same idiom as `ui/uiToggle.ts` and `ui/uiAccordion.ts`.
 *
 * Every length is a rem-based Tailwind utility; the only px left is the 1px
 * border, which "Железные правила адаптива" keeps in px on purpose (a hairline
 * at a 11px root would render at 0.69px — grey mush instead of a line).
 */

/**
 * 32×32 (`size-8` = 2rem), fully round. `box-border` keeps the 1px border
 * inside the 32, the way phase 1 learned to on the footer button; `shrink-0`
 * because the row it sits in can run out of width before it does.
 */
export const UI_CHECKBOX_BASE_CLASS =
  'ui-checkbox box-border flex size-8 shrink-0 items-center justify-center rounded-full border transition-colors'

/** State = Selected — `checkbox/bg/default` #030213 on both fill and border. */
export const UI_CHECKBOX_SELECTED_CLASS = 'ui-checkbox--selected border-primary bg-primary'

/** State = Unselected — `checkbox/border` #eaeaeb, no fill. */
export const UI_CHECKBOX_UNSELECTED_CLASS = 'border-ink-300'

/** The tick: 16 inside the 32, `checkbox/icon` #ffffff. */
export const UI_CHECKBOX_ICON_CLASS = 'ui-checkbox__icon size-4 shrink-0 text-white'

export function resolveUiCheckboxClasses(checked: boolean): string {
  return `${UI_CHECKBOX_BASE_CLASS} ${
    checked ? UI_CHECKBOX_SELECTED_CLASS : UI_CHECKBOX_UNSELECTED_CLASS
  }`
}
