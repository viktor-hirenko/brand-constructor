/**
 * Class map for `UiStepHeader.vue`.
 *
 * Kit source: Figma section `4463:9758` → symbol `3984:8226` (Step header).
 * https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=3984-8226&m=dev
 *
 * Measured off the symbol (`get_metadata` + `get_variable_defs`, not guessed):
 *
 *   Text            y=0    h=64   ├─ Title + Badge  h=32, badge 8 after title
 *                                 └─ Description    y=40 → 8 below the title row
 *   Progress        y=88          → 24 below the text block
 *   Alert           y=144         → 24 below the progress
 *
 *   step header/title       #1f1f2e, header l 24/32 medium
 *   step header/description #6f6f7d, body 16/24 regular
 *
 * The same symbol is instanced on the step-8 key screen (`4463:9147` →
 * `4463:9151`), which is why the review shell's 30px title comes down to 24 —
 * it is the same component in the mockup.
 *
 * ── Why a `.ts` map ──────────────────────────────────────────────────────────
 * `packages/constructor` has no `@vue/test-utils` and no `jsdom`, and
 * `vitest.config.ts:11` sets `environment: 'node'` — components cannot be
 * mounted here. So the part that can silently regress, the class decision, is a
 * pure function; slots and markup stay under manual acceptance on prod. Same
 * idiom as `ui/uiButton.ts`.
 *
 * ── Geometry is rem-only ─────────────────────────────────────────────────────
 * `gap-6` (1.5rem), `gap-2` (0.5rem), `text-2xl` (1.5rem) and `text-base` (1rem)
 * all follow the single embed knob (`app.css` `html.wizard-embed`). A `px`
 * length here would silently stop scaling with the Admin panel.
 *
 * The two `tracking-[…px]` values are carried over from the wizard and the edit
 * flow verbatim. The kit sets letter-spacing 0, but open question 7 (default
 * answer) keeps the current rendering on carry-over screens, because dropping
 * tracking rewraps every line of text at once. `px` is the documented unit for
 * tracking — see "Железные правила адаптива".
 */

export interface UiStepHeaderClassSet {
  /** Outer column: text block, progress, alert — 24 apart. */
  root: string
  /** Title row + description — 8 apart. */
  text: string
  /** Title and its badge slot — 8 apart, wrapping on a narrow panel. */
  titleRow: string
  /** header l 24/32 medium in `step header/title`. */
  title: string
  /** body 16/24 regular in `step header/description`. */
  description: string
}

/** kit `spacing/24` between text, progress and alert. */
export const UI_STEP_HEADER_ROOT_CLASS = 'ui-step-header flex w-full flex-col gap-6'

/** kit `spacing/8` between the title row and the description. */
export const UI_STEP_HEADER_TEXT_CLASS = 'ui-step-header__text flex flex-col gap-2'

/** kit `spacing/8` between the title and the badge; wraps when the panel is narrow. */
export const UI_STEP_HEADER_TITLE_ROW_CLASS =
  'ui-step-header__title-row flex flex-wrap items-center gap-2'

/** `text-2xl` is 1.5rem/2rem = the kit's header l 24/32. */
export const UI_STEP_HEADER_TITLE_CLASS =
  'ui-step-header__title text-2xl font-medium text-ink-900 tracking-[0.0703px]'

/** `text-base` is 1rem/1.5rem = the kit's body 16/24. */
export const UI_STEP_HEADER_DESCRIPTION_CLASS =
  'ui-step-header__description text-base text-ink-700 tracking-[-0.3125px]'

export function resolveUiStepHeaderClasses(): UiStepHeaderClassSet {
  return {
    root: UI_STEP_HEADER_ROOT_CLASS,
    text: UI_STEP_HEADER_TEXT_CLASS,
    titleRow: UI_STEP_HEADER_TITLE_ROW_CLASS,
    title: UI_STEP_HEADER_TITLE_CLASS,
    description: UI_STEP_HEADER_DESCRIPTION_CLASS,
  }
}
