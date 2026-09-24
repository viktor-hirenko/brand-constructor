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
 *   Alert           y=80          → 16 below the text block
 *
 *   step header/title       #1f1f2e, header l 24/32 medium
 *   step header/description #6f6f7d, body 16/24 regular
 *
 * The same symbol is instanced on the step-8 key screen (`4463:9147` →
 * `4463:9151`), which is why the review shell's 30px title comes down to 24 —
 * it is the same component in the mockup.
 *
 * ── Re-measured 2026-09-24 against the current canvas ────────────────────────
 * Two numbers in the block above changed, and the second one changed the shape
 * of the component:
 *
 *  1. **Text → Alert is 16, not 24.** The symbol is 440×168 = 64 + 16 + 88, and
 *     both drawn step-8 screens agree: `5387:91772` (author) is Text 0–64 with
 *     the Alert at y=80, `5387:78997` (CEO) is Text 0–32 with the Alert at 48.
 *  2. **The kit step header carries no progress row at all.** There is no such
 *     node in the symbol — not even a hidden one — and none on any drawn
 *     screen: step 7 `5382:57234` is 527×88, which is title 32 + 8 +
 *     a two-line description 48 and nothing else. In the kit the progress is a
 *     1px line at the bottom of `Wizard header` `5382:30951`, the one component
 *     of 34 we have not built (row 4 of the divergences file).
 *
 * So `gap-4` is the kit's own number, and the progress row — which only we draw
 * — keeps its former 24 by adding its own 8 on top. Do not fold that 8 into the
 * root gap: that would move the alert too, and the alert has a measurement.
 *
 * ── Why a `.ts` map ──────────────────────────────────────────────────────────
 * `packages/constructor` has no `@vue/test-utils` and no `jsdom`, and
 * `vitest.config.ts:11` sets `environment: 'node'` — components cannot be
 * mounted here. So the part that can silently regress, the class decision, is a
 * pure function; slots and markup stay under manual acceptance on prod. Same
 * idiom as `ui/uiButton.ts`.
 *
 * ── Geometry is rem-only ─────────────────────────────────────────────────────
 * `gap-4` (1rem), `gap-2` (0.5rem), `text-2xl` (1.5rem) and `text-base` (1rem)
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
  /** Outer column: text block, progress, alert — 16 apart. */
  root: string
  /** Title row + description — 8 apart. */
  text: string
  /** Title and its badge slot — 8 apart, wrapping on a narrow panel. */
  titleRow: string
  /** header l 24/32 medium in `step header/title`. */
  title: string
  /** body 16/24 regular in `step header/description`. */
  description: string
  /** Progress row — ours, not the kit's: 8 on top of the root gap keeps it 24. */
  progress: string
}

/** kit `spacing/16` between the text block and the alert (`3984:8226`). */
export const UI_STEP_HEADER_ROOT_CLASS = 'ui-step-header flex w-full flex-col gap-4'

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

/**
 * The progress row has no kit counterpart in this component, so it has no
 * measurement of its own either: `mt-2` on top of the root `gap-4` reproduces
 * the 24 the wizard shipped with. It moves — or goes — with the Wizard header
 * work, not before it.
 */
export const UI_STEP_HEADER_PROGRESS_CLASS = 'ui-step-header__progress mt-2'

export function resolveUiStepHeaderClasses(): UiStepHeaderClassSet {
  return {
    root: UI_STEP_HEADER_ROOT_CLASS,
    text: UI_STEP_HEADER_TEXT_CLASS,
    titleRow: UI_STEP_HEADER_TITLE_ROW_CLASS,
    title: UI_STEP_HEADER_TITLE_CLASS,
    description: UI_STEP_HEADER_DESCRIPTION_CLASS,
    progress: UI_STEP_HEADER_PROGRESS_CLASS,
  }
}
