/**
 * Class map for `UiSectionCard.vue`.
 *
 * Kit source: section `Section card` `3761:2975` → symbol `3761:2273`.
 * https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=3761-2273&m=dev
 *
 * ── What the symbol measures (get_metadata 3761:2273)
 *
 *   Header        500 × 56       Title frame inset 16/16, Action 128×40 at
 *                                x = 364 → right padding 8
 *   Title frame   title · gap 8 · Badge · gap 8 · Status indicator, all 24 tall
 *   Divider       full width, y = 56
 *   Content       padding 16; property list; gap 16 to the comment section
 *
 * The drawn screen confirms every number at the real width — Final review
 * `5387:91779` is the same symbol at 527: header 56, action at x = 391
 * (527 − 391 − 128 = 8), content padding 16, 16 between the property list and
 * the comment, 16 between neighbouring cards.
 *
 * ── The title is 18/24, not the 16/24 the plan promised
 *
 * `get_variable_defs` on the title text node `3760:1877` returns `header/s`
 * = Inter Medium 18/24 in `section card/content/value` #1f1f2e — twice, once
 * from the card and once from the text itself. The plan's inventory row says
 * "18/24 против kit 16/24"; the kit says otherwise, so the size the screen
 * already ships is correct and only its colour moves (#0a0a0a → ink-900).
 * The plan text is not edited to match after the fact (AGENTS §7).
 *
 * ── Colours read off the export, not off the token names
 *
 * Phase 12's acceptance found a chevron wearing the wrong token because one
 * node hands back several icon colours at once. So these were sampled from the
 * rendered PNG of `5387:91779`: border (234,234,235) = #eaeaeb → ink-300, the
 * divider the same, title (31,31,46) = #1f1f2e → ink-900, card fill #ffffff.
 *
 * ── Why a `.ts` map and not a component test
 *
 * `packages/constructor` has no `@vue/test-utils` and no `jsdom`, and
 * `vitest.config.ts:11` sets `environment: 'node'` — mounting is impossible, so
 * the class decision is a pure function and the markup stays under manual
 * acceptance on prod. Same idiom as `ui/uiAccordion.ts` and `ui/uiField.ts`.
 *
 * ── Lengths
 *
 * Every length is a rem-based Tailwind utility; the hairline border is the
 * documented px exception. See "Железные правила адаптива" in
 * `docs/design-audit/dp-15258-ui-kit.md`.
 *
 * ── Letter-spacing
 *
 * Open question 7's default answer — keep the current look on вынос screens —
 * is honourable here, unlike in phase 11: every title in review carries
 * `-0.1504px` and nothing else does. The kit sets 0; the divergence is kept and
 * pinned by the test so that flipping it stays a decision, not a slip.
 */

/**
 * `radius/section-card` 16 → `rounded-2xl`, `section card/bg` #ffffff,
 * `section card/border` #eaeaeb → ink-300. `box-border` keeps the 1px border
 * inside the drawn box, the lesson phase 1 learned on the footer buttons.
 */
// The kit strokes the card INSIDE its box (`5387:91779`: the 56 header starts
// at 0 and a card is exactly header + content). A CSS border adds 2 px per card,
// ~20 px down the step-8 list — owner 29.09. An inset ring draws the same line
// without taking space.
export const UI_SECTION_CARD_CLASS =
  'ui-section-card box-border rounded-2xl bg-white ring-1 ring-inset transition-[box-shadow,outline-color]'

/** Kit `section card/border` #eaeaeb. */
export const UI_SECTION_CARD_BORDER_CLASS = 'ring-ink-300'

/**
 * Ours, not the kit's: review marks the section that still needs a comment.
 * The kit draws no such state, and the screen has carried it since long before
 * DP-15258, so it is kept byte for byte — amber 400 rim plus a 2px halo.
 *
 * It lives in this function rather than at the call site for the reason
 * `uiField.ts` gives about its `focused` flag: two `border-color` utilities on
 * one element are resolved by Tailwind's own property order, not by the order
 * they are written in, so the choice has to be made once, here.
 */
export const UI_SECTION_CARD_HIGHLIGHTED_CLASS =
  'ui-section-card--highlighted ring-amber-400 outline-2 outline-amber-200'

export interface UiSectionCardOptions {
  /** Ours, not the kit's — see `UI_SECTION_CARD_HIGHLIGHTED_CLASS`. */
  highlighted?: boolean
}

export function resolveUiSectionCardClasses(options: UiSectionCardOptions = {}): string {
  const { highlighted = false } = options
  const border = highlighted ? UI_SECTION_CARD_HIGHLIGHTED_CLASS : UI_SECTION_CARD_BORDER_CLASS
  return `${UI_SECTION_CARD_CLASS} ${border}`
}

/**
 * Header 56 tall with the kit's asymmetric inset: 16 on the title side, 8 on
 * the action side, because the Ghost action carries its own 12 of padding.
 */
export const UI_SECTION_CARD_HEADER_CLASS =
  'ui-section-card__header flex h-14 items-center justify-between pl-4 pr-2'

/** Title · gap 8 · Badge · gap 8 · Status indicator, the kit's Title frame. */
export const UI_SECTION_CARD_TITLE_GROUP_CLASS =
  'ui-section-card__title-group flex min-w-0 flex-1 items-center gap-2'

/** `header/s` 18/24 Medium in `section card/content/value` #1f1f2e. */
export const UI_SECTION_CARD_TITLE_CLASS =
  'ui-section-card__title text-lg/6 font-medium text-ink-900'

/** Content padding `spacing/16`; 16 again between the property list and the comment. */
export const UI_SECTION_CARD_BODY_CLASS = 'ui-section-card__body flex flex-col p-4'

/** The property list itself — `spacing/16` between properties (drawn 60 − 44). */
export const UI_SECTION_CARD_CONTENT_CLASS = 'ui-section-card__content flex flex-col gap-4'
