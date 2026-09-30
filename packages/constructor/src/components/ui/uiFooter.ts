/**
 * Class map for `UiFooter.vue`.
 *
 * Kit source: Figma `Navigation bar` — the mockup draws it in two shapes, and
 * both were measured off the key screens (`get_metadata` + `get_design_context`,
 * not guessed):
 *
 *   bar    `5395:118753`  591×73 — border-top `divider/default` #eaeaeb,
 *                       fill `bg/alt-1` #f9f9fb, padding **12 / 32**,
 *                       two L-48 buttons of a fixed **128**, 8 apart
 *                       (1 + 12 + 48 + 12 = the 73 all four frames draw).
 *                       The 24 / 48 that stood here came from `3984:7719` on
 *                       the old canvas; the responsive section supersedes it,
 *                       and the only place 24 survives is above 1920, where
 *                       `5395:119557` grows the bar to 97 — that one lives in
 *                       `app.css`, because it is a breakpoint, not a shape
 *   stack  `4463:9161`  504×104 — no chrome at all, full-width L-48 buttons
 *                       8 apart, primary on top
 *
 * `4378:16948` adds the third piece: a note under the buttons, `spacing/12`
 * below them. That is the CEO warning («Додайте хоча б один коментар…»), and it
 * is why the root is a column with `gap-3` and the buttons live in their own
 * `gap-2` box.
 *
 * ── Why one component for both shapes ────────────────────────────────────────
 * Before DP-15258 phase 4 the same slot was written four times: the wizard bar
 * (`BriefShellView`, no fill, `gap-3`, natural-width buttons), the edit-flow bar
 * (`EditFlowFooter`, which this file replaces), and two review stacks
 * (`AuthorActionsFooter`, `SupervisorActionsFooter`, `space-y-3`, `rounded-xl`,
 * raw `<button>`). Three geometries for one thing.
 *
 * ── Why a `.ts` map ──────────────────────────────────────────────────────────
 * `packages/constructor` has no `@vue/test-utils` and no `jsdom`, and
 * `vitest.config.ts:11` sets `environment: 'node'` — components cannot be
 * mounted here. So the part that can silently regress, the class decision, is a
 * pure function; slots and markup stay under manual acceptance on prod. Same
 * idiom as `ui/uiButton.ts`, `ui/uiStepHeader.ts`, `ui/uiDivider.ts`.
 *
 * ── Geometry is rem-only ─────────────────────────────────────────────────────
 * `gap-3`, `gap-2`, `px-8`, `py-3`, `w-32` are all rem on Tailwind's spacing
 * scale. Since the responsive work the root font-size is a fixed 16 in both
 * modes, so each of them is exactly its design pixel. The 1px top rule is the
 * documented hairline exception. See "Железные правила адаптива" in
 * `docs/design-audit/dp-15258-ui-kit.md`.
 */

export type UiFooterLayout = 'bar' | 'stack'

export interface UiFooterClassSet {
  /** Outer column: the actions box and the note under it. */
  root: string
  /** The buttons box — row in a bar, column in a stack. */
  actions: string
  /** Per-button class: the bar fixes 128, the stack fills the column. */
  button: string
}

/** kit `spacing/12` between the buttons and the note under them (`4378:16948`). */
export const UI_FOOTER_ROOT_CLASS = 'ui-footer flex w-full min-w-0 flex-col gap-3'

/**
 * `bar` carries the whole chrome: the rule spans the full column while the
 * buttons stay inside the 48px inset, which is what `px-12` on the bar itself
 * buys. `stack` has no chrome — in the mockup it is just a column of buttons
 * sitting in the review content.
 */
export const UI_FOOTER_LAYOUT: Record<UiFooterLayout, string> = {
  bar: 'ui-footer--bar shrink-0 border-t border-ink-300 bg-ink-100 px-8 py-3',
  stack: 'ui-footer--stack',
}

/** kit `spacing/8` between the two buttons, in both shapes. */
export const UI_FOOTER_ACTIONS: Record<UiFooterLayout, string> = {
  bar: 'ui-footer__actions flex min-w-0 items-center gap-2',
  stack: 'ui-footer__actions flex min-w-0 flex-col gap-2',
}

/**
 * `w-32` is the kit's 128. Every drawn bar has it — `5395:118754` at 1440,
 * `5395:119381` at 1280, `5395:119201` at 1920, `5395:119558` at 2560 — and it
 * does not change with the breakpoint, which is the whole point of this work:
 * the columns move, the controls do not. Before this the two buttons were
 * `block` and split the column between them, so they grew with the panel.
 *
 * The stack keeps the full column width: on the drawn review `5387:91813` the
 * buttons are 527 wide, i.e. the content column itself. It is `w-full`, not the
 * button's `block` (`flex-1`): in a column that is a zero basis, the kit `h-12`
 * stops holding and a bordered button grows to 50 — CEO view `5387:83684`.
 */
export const UI_FOOTER_BUTTON: Record<UiFooterLayout, string> = {
  bar: 'w-32',
  stack: 'w-full',
}

export function resolveUiFooterClasses(layout: UiFooterLayout = 'bar'): UiFooterClassSet {
  return {
    root: `${UI_FOOTER_ROOT_CLASS} ${UI_FOOTER_LAYOUT[layout]}`,
    actions: UI_FOOTER_ACTIONS[layout],
    button: UI_FOOTER_BUTTON[layout],
  }
}
