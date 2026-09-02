/**
 * Class map for `UiFooter.vue`.
 *
 * Kit source: Figma `Navigation bar` — the mockup draws it in two shapes, and
 * both were measured off the key screens (`get_metadata` + `get_design_context`,
 * not guessed):
 *
 *   bar    `3984:7719`  600×97 — border-top `divider/default` #ededee,
 *                       fill `bg/alt-1` #f9f9fb, padding 24 / 48,
 *                       two L-48 buttons `flex-1` 8 apart (248 + 8 + 248)
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
 * `gap-3`, `gap-2`, `px-12`, `py-6` are all rem on Tailwind's spacing scale, so
 * they follow the single embed knob (`app.css` `html.wizard-embed`). The 1px
 * top rule is the documented hairline exception, and `#f9f9fb` is a colour, not
 * a length. See "Железные правила адаптива" in `docs/design-audit/dp-15258-ui-kit.md`.
 */

export type UiFooterLayout = 'bar' | 'stack'

export interface UiFooterClassSet {
  /** Outer column: the actions box and the note under it. */
  root: string
  /** The buttons box — row in a bar, column in a stack. */
  actions: string
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
  bar: 'ui-footer--bar shrink-0 border-t border-ink-300 bg-[#f9f9fb] px-12 py-6',
  stack: 'ui-footer--stack',
}

/** kit `spacing/8` between the two buttons, in both shapes. */
export const UI_FOOTER_ACTIONS: Record<UiFooterLayout, string> = {
  bar: 'ui-footer__actions flex min-w-0 items-center gap-2',
  stack: 'ui-footer__actions flex min-w-0 flex-col gap-2',
}

export function resolveUiFooterClasses(layout: UiFooterLayout = 'bar'): UiFooterClassSet {
  return {
    root: `${UI_FOOTER_ROOT_CLASS} ${UI_FOOTER_LAYOUT[layout]}`,
    actions: UI_FOOTER_ACTIONS[layout],
  }
}
