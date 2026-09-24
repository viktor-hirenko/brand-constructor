/**
 * Shared layout for CEO re-select and PO edit step screens (layoutMode === 'edit').
 * Horizontal inset (32px) lives in EditFlowStepShell — not on the dual-pane column.
 * Subtitle → first block: shell body gap-6 (24px) + pt-2 (8px) = 32px.
 *
 * Every number below is measured off the edit-flow frames themselves, not off
 * the plan (DP-15258 phase 18). The six sections agree with each other:
 * `4492:25743` (Concept & External Naming / Edit), `4492:28515` (External
 * Naming / Edit), `4492:10154` (Select new Concept + new External name),
 * `4492:16446` (Internal Naming), `4492:16841` (Product view returned from
 * CEO) and `4463:14684` (Product view / Edit Concept & External name).
 */

/**
 * Body content inset — the kit's `spacing/32` on `Step content`, the same on
 * every breakpoint frame and on the drawn step-8 review `5387:91771`. It was
 * 48, carried over from the pre-kit dual-pane column; the responsive work put
 * both panes on 32, and this has to move with them or the body and the bar
 * under it stop lining up.
 */
export const EDIT_FLOW_CONTENT_INSET_CLASS = 'px-8'

export const EDIT_FLOW_BODY_OFFSET_CLASS = 'flex flex-col pt-2'

/**
 * 24 between two sibling blocks above the divider («Ваш попередній вибір» →
 * «Вибір CEO»). `4492:29255`: the first sub-block ends at 196, the second
 * starts at 220.
 */
export const EDIT_FLOW_PRE_DIVIDER_GROUP_CLASS = 'flex flex-col gap-6'

/**
 * Spacing and the full-bleed hook only — the rule itself is `UiDivider`
 * (Figma `3446:5229`), which is why the colour left this string in DP-15258
 * phase 3. `edit-flow-divider` stays: `EditFlowStepShell` reaches for it with
 * `:deep()` to pull the line out of the 48px inset.
 *
 * **48, not 40.** The kit gives the divider the container's own padding on both
 * sides: on `4492:27189` the block above ends at 426 inside a 474-tall
 * container, and the block below opens at y=48 of the next one. Same on
 * `4492:29250`, `4492:16446` and `4492:12413`. It stood at `my-10` (40).
 */
export const EDIT_FLOW_DIVIDER_CLASS = 'edit-flow-divider my-12'

/**
 * 12 from a section label to the cards under it — `4492:27444` → `4492:27445`,
 * `4492:29268` → `4492:29269`, `4492:16109` → `4492:16355`, `4492:13066` →
 * `4492:15655`: the label is a 24-tall line and the list opens at y=36.
 *
 * It stood at 24, while the blocks above the divider on the very same screens
 * already used 12 — one screen carried both numbers.
 */
export const EDIT_FLOW_SECTION_TO_GRID_GAP_CLASS = 'gap-3'

/**
 * 16 where the label shares its row with the theme switch, because that row is
 * the segmented control's own 40 and not a 24 line: `4492:12425` (40 tall) →
 * grid at y=56, same on `4492:11569` → `4492:11575` and `4492:27204` →
 * `4492:27210`. Also 24 before this phase.
 */
export const EDIT_FLOW_CONTROL_ROW_TO_GRID_GAP_CLASS = 'gap-4'

/**
 * 24 from the cascade alert to the section under it — `4492:13140` is 112 tall
 * and the list container opens at 136 (`4492:12592`); `4463:16224` → `4463:16090`
 * repeats it. The third frame that carries this alert, `4492:27551`, leaves 32;
 * two of three say 24 and the code already did.
 */
export const EDIT_FLOW_ALERT_TO_SECTION_GAP_CLASS = 'mb-6'

/**
 * «Ваш попередній вибір» next to «Вибір CEO» on the revision concept screen.
 *
 * Two equal columns **8** apart, not 16: `4492:27194` is a 500 container
 * holding two 246 frames at x=0 and x=254. That is the same 8 the concept grid
 * below it already uses, so the two blocks line up.
 */
export const EDIT_FLOW_CONCEPT_PAIR_GRID_CLASS = 'grid grid-cols-2 gap-2 max-w-[31.625rem]'

/** 32 from cards/grid block to the comment field below (Figma edit-flow). */
export const EDIT_FLOW_GRID_TO_COMMENT_GAP_CLASS = 'mb-8'

export const EDIT_FLOW_POST_DIVIDER_SECTION_CLASS = `flex flex-col ${EDIT_FLOW_SECTION_TO_GRID_GAP_CLASS}`

/** Post-divider section whose label row carries the theme switch. */
export const EDIT_FLOW_POST_DIVIDER_CONTROL_SECTION_CLASS = `flex flex-col ${EDIT_FLOW_CONTROL_ROW_TO_GRID_GAP_CLASS}`

/** Cards/grid section immediately followed by StepCommentField on reselect screens. */
export const EDIT_FLOW_CARDS_BEFORE_COMMENT_SECTION_CLASS = `${EDIT_FLOW_POST_DIVIDER_SECTION_CLASS} ${EDIT_FLOW_GRID_TO_COMMENT_GAP_CLASS}`

/** Same, for the sections whose label row carries the theme switch. */
export const EDIT_FLOW_CONTROL_CARDS_BEFORE_COMMENT_SECTION_CLASS = `${EDIT_FLOW_POST_DIVIDER_CONTROL_SECTION_CLASS} ${EDIT_FLOW_GRID_TO_COMMENT_GAP_CLASS}`

/**
 * 32 from the last block to the comment field where the comment is a plain
 * sibling rather than the block's own bottom margin. Same measurement as
 * `EDIT_FLOW_GRID_TO_COMMENT_GAP_CLASS`; the slot carried 24, 32 and 48 on
 * three different screens before this phase.
 */
export const EDIT_FLOW_COMMENT_OFFSET_CLASS = 'mt-8'
