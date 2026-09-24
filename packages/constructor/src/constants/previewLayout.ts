/**
 * Preview-panel header → the preview slot under it.
 *
 * Kit `Preview panel` `3839:9513`: `Content` is a column with `spacing/24`,
 * its `Header` is 32 tall and the `Preview` slot opens at y=56. Measured on
 * the drawn review `I5387:91948;3839:9515` (header 0–32, preview at 56) and on
 * all four responsive frames (`I5395:118764;3717:1809` and siblings).
 *
 * It was 80, set when the right column scaled with the Admin panel and the
 * number was eyeballed rather than read off a node. Divergences row 51.
 */
export const MOBILE_PHONE_PREVIEW_TITLE_GAP_CLASS = 'gap-6'

/**
 * Height the skeletons reserve for that header while the name is unknown —
 * the kit's 32, so the square below it opens in the same place as it will
 * once the real header arrives. Was 56, which is header + gap, counted twice.
 */
export const PREVIEW_HEADER_RESERVE_CLASS = 'h-8'
