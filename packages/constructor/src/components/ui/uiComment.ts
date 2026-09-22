/**
 * Class map for `UiComment.vue`.
 *
 * Kit source: section `Comment` `3443:4988` → frame `3439:1309`, three symbols:
 * https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=3439-1309&m=dev
 *
 *   Type = Default     `3439:1383`  400 × 68   label · gap 4 · value
 *   Type = Unresolved  `3443:4874`  400 × 112  the same + a Secondary S-32
 *                                              button 12 below, and a blue
 *                                              rail down the left edge
 *   Type = Resolved    `3443:4879`  400 × 112  the same button, no rail
 *
 * ── Geometry
 *
 * The box is an Input: `radius/input` 8, `comment/bg/default` #f9f9fb. Its text
 * frame sits at 12/12 and the text itself is inset another 4 horizontally, so
 * the value's real inset is **16 across and 12 down** — the identical
 * arrangement phase 11 measured on the kit's Input and encoded in `uiField.ts`.
 * Measured back off the rendered PNG of the drawn card `5387:91779`: box top
 * 192, first label pixel at y = 207 and x = 33 against a box left edge of 16.
 *
 * Gaps: label → value `spacing/4`, text block → button `spacing/12`.
 *
 * ── The unresolved rail is 2px of `comment/border/accent` #3a5bc7
 *
 * Both numbers were taken off the export rather than guessed: the screenshot of
 * `3439:1309` has exactly two columns of (58,91,199) at the left edge of the
 * Unresolved symbol and none at the other two. #3a5bc7 is the kit blue that
 * already backs `--color-blue-content` (and `status indicator/info`, which
 * phase 7 put on the unread dot). The screen shipped #4882ff, which the kit
 * does not contain.
 *
 * Padding does NOT change when the rail appears — the kit's text frame stays at
 * x = 12 in all three symbols — so the rail is drawn inside the box's own
 * border, not added to it.
 *
 * ── Colours land on tokens, never on hex
 *
 * #f9f9fb → ink-100 (added in phase 11 precisely for this component),
 * #6f6f7d → ink-700, #1f1f2e → ink-900, #3a5bc7 → blue-content. The four
 * hand-written colours this replaces (`rgba(217,217,217,0.2)`,
 * `rgba(197,197,200,0.2)`, #5b5b62, #3d3d3d) appear nowhere in the kit.
 *
 * ── Why a `.ts` map and not a component test
 *
 * `packages/constructor` has no `@vue/test-utils` and no `jsdom`, and
 * `vitest.config.ts:11` sets `environment: 'node'` — mounting is impossible, so
 * the class decision is a pure function and the markup stays under manual
 * acceptance on prod.
 *
 * ── Letter-spacing
 *
 * Open question 7's default — keep the current look — holds: all three comment
 * carriers drew label and value at `-0.1504px`, so that is what stays, even
 * though the kit sets 0. Property labels keep their own (none), because that is
 * what THEY drew. Both are pinned by tests.
 */

/**
 * `radius/input` 8 → `rounded-lg`, `comment/bg/default` #f9f9fb → ink-100,
 * inset 16 across / 12 down, `spacing/12` between the text block and the
 * footer. `box-border` keeps the rail inside the drawn box.
 */
export const UI_COMMENT_CLASS =
  'ui-comment box-border flex flex-col gap-3 overflow-hidden rounded-lg bg-ink-100 px-4 py-3 transition-colors'

/**
 * Kit Type = Unresolved — 2px of `comment/border/accent` #3a5bc7 down the left
 * edge.
 *
 * The kit keeps its text frame at x = 12 in all three symbols, so the rail is
 * drawn ON the box, not beside it: the text must not move when a comment goes
 * from resolved to unresolved. A bare `border-l-2` would push it 2px right —
 * which is what the screen shipped — so the left inset gives the border its
 * 2px back. `calc` and not a second scale: the 2px are the documented hairline
 * exception ("Железные правила адаптива"), the 1rem is the knob's.
 */
export const UI_COMMENT_UNRESOLVED_CLASS =
  'ui-comment--unresolved border-l-2 border-solid border-blue-content pl-[calc(1rem-2px)]'

/** `caption/l/medium` 14/16 in `comment/content/label` #6f6f7d. */
export const UI_COMMENT_LABEL_CLASS =
  'ui-comment__label text-sm/4 font-medium tracking-[-0.1504px] text-ink-700'

/** `body/regular` 16/24 in `comment/content/value` #1f1f2e. */
export const UI_COMMENT_VALUE_CLASS =
  'ui-comment__value whitespace-pre-line text-base font-normal tracking-[-0.1504px] text-ink-900'

/** Label · `spacing/4` · value, the kit's inner Text frame. */
export const UI_COMMENT_BODY_CLASS = 'ui-comment__body flex flex-col gap-1'

export interface UiCommentOptions {
  /** Kit Type = Unresolved — adds the blue rail. Default and Resolved have none. */
  unresolved?: boolean
}

export function resolveUiCommentClasses(options: UiCommentOptions = {}): string {
  const { unresolved = false } = options
  return unresolved ? `${UI_COMMENT_CLASS} ${UI_COMMENT_UNRESOLVED_CLASS}` : UI_COMMENT_CLASS
}
