/**
 * CEO comment card — Figma Brand-Builder 1979:1533 / Comment component.
 *
 * What is left here is the card's paint. The button recipes that used to live
 * alongside it are gone: DP-15258 phase 10 put «Позначити як вирішений» /
 * «Вирішено» on the kit's Secondary S-32 (`3443:4915` / `3443:4916` inside the
 * kit Comment `3439:1309`) and «Застосувати варіант CEO» on Secondary L-48
 * (the 495×48 `Button` instance in `5387:105224`).
 *
 * The four colours below stay hand-written on purpose — they are the Comment
 * component's own surface, and the kit values for it (`comment/bg/default`
 * #f9f9fb, `comment/content/label` #6f6f7d, `comment/content/value` #1f1f2e)
 * land in phase 13 together with `UiComment`. Changing them here would move
 * paint on a screen this phase is not allowed to restyle.
 */

export const CEO_COMMENT_CARD_BG = 'rgba(217,217,217,0.2)'
export const CEO_COMMENT_UNRESOLVED_ACCENT = '#4882ff'
export const CEO_COMMENT_LABEL_COLOR = '#5b5b62'
export const CEO_COMMENT_VALUE_COLOR = '#3d3d3d'

/**
 * Secondary outline action — **dead, zero call sites**, and deliberately not
 * deleted here: the plan gives it to phase 20 together with the other residue.
 * Its value is the exact string it has always produced; the two constants it
 * used to be composed from were the resolve button's recipe, which phase 10
 * removed. Verify it is still unused:
 *   grep -rn 'REVIEW_SECONDARY_ACTION_BUTTON_CLASS' packages/constructor/src
 */
export const REVIEW_SECONDARY_ACTION_BUTTON_CLASS = [
  'inline-flex items-center self-start justify-center rounded-[8px] border border-solid p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50',
  'w-full',
  'border-[rgba(0,0,0,0.1)] bg-[#ffffff] hover:bg-[rgba(0,0,0,0.03)]',
].join(' ')
