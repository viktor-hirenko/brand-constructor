/**
 * What is left of the CEO comment card's hand-written paint: nothing.
 *
 * DP-15258 phase 13 put the card on the kit's Comment (`3439:1309`) via
 * `ui/UiComment.vue`, so the four colours that used to live here —
 * `rgba(217,217,217,0.2)`, #4882ff, #5b5b62, #3d3d3d, none of which the kit
 * contains — are now `comment/bg/default` #f9f9fb (ink-100),
 * `comment/border/accent` #3a5bc7 (blue-content), `comment/content/label`
 * #6f6f7d (ink-700) and `comment/content/value` #1f1f2e (ink-900), all read
 * from `ui/uiComment.ts` and none of them written as hex.
 *
 * Phase 10 had already taken the button recipes out of this file:
 * «Позначити як вирішений» / «Вирішено» onto the kit's Secondary S-32
 * (`3443:4915` / `3443:4916`) and «Застосувати варіант CEO» onto Secondary
 * L-48 (the 495×48 `Button` instance in `5387:105224`).
 */

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
