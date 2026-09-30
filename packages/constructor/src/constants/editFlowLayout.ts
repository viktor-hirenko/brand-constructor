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

/**
 * No top padding of its own: the shell already puts the kit 24 between the
 * step header and the body. The extra 8 (`pt-2`) made it 32 — owner 29.09 on
 * the External Naming edit screen: «не должно быть верхнего паддинга».
 */
export const EDIT_FLOW_BODY_OFFSET_CLASS = 'flex flex-col'

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
 * **32.** The refactor mockups give the divider the container's own 32 padding
 * on both sides: CEO reselect `5387:102295` (card ends 326.3, rule at 358.3,
 * next block at 390.3), `5387:104945`, and the author's revision screens
 * `5395:107475`, `5395:107506`, `5395:111458`. It was 48 after the old drawings
 * (`4492:27189`), 40 before that. Owner 30.09.
 */
export const EDIT_FLOW_DIVIDER_CLASS = 'edit-flow-divider my-8'

/**
 * «Вибір замовника» concept card on the CEO reselect screen: a third of the
 * column, as the kit lays it out — `5387:102295` draws 170.3 in a 527 column
 * ((527 − 2 × 8) / 3). Was a fixed 162. Owner 30.09.
 */
export const EDIT_FLOW_AUTHOR_PICK_CARD_CLASS = 'w-[calc((100%-1rem)/3)]'

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
 * Two equal columns **8** apart across the whole column: `5395:107475` draws
 * two 259.5 cards in the 527 content (it was capped at 506 after the old
 * `4492:27194`, cards 249). Owner 30.09.
 */
export const EDIT_FLOW_CONCEPT_PAIR_GRID_CLASS = 'grid grid-cols-2 gap-2'

/**
 * 24 from cards/grid block to the comment field below — the refactor mockups
 * (`5387:101072`: every CEO reselect screen, Input 24 under its Container).
 * Was 32 for the old edit-flow drawings, plus the field's own 8 on top.
 */
export const EDIT_FLOW_GRID_TO_COMMENT_GAP_CLASS = 'mb-6'

export const EDIT_FLOW_POST_DIVIDER_SECTION_CLASS = `flex flex-col ${EDIT_FLOW_SECTION_TO_GRID_GAP_CLASS}`

/** Post-divider section whose label row carries the theme switch. */
export const EDIT_FLOW_POST_DIVIDER_CONTROL_SECTION_CLASS = `flex flex-col ${EDIT_FLOW_CONTROL_ROW_TO_GRID_GAP_CLASS}`

/** Cards/grid section immediately followed by StepCommentField on reselect screens. */
export const EDIT_FLOW_CARDS_BEFORE_COMMENT_SECTION_CLASS = `${EDIT_FLOW_POST_DIVIDER_SECTION_CLASS} ${EDIT_FLOW_GRID_TO_COMMENT_GAP_CLASS}`

/** Same, for the sections whose label row carries the theme switch. */
export const EDIT_FLOW_CONTROL_CARDS_BEFORE_COMMENT_SECTION_CLASS = `${EDIT_FLOW_POST_DIVIDER_CONTROL_SECTION_CLASS} ${EDIT_FLOW_GRID_TO_COMMENT_GAP_CLASS}`

/**
 * 24 from the last block to the comment field where the comment is a plain
 * sibling rather than the block's own bottom margin. Same measurement as
 * `EDIT_FLOW_GRID_TO_COMMENT_GAP_CLASS` — `5387:99729` (Container ends 459.5,
 * Input at 483.5) and the revision screen `5395:107376`.
 */
export const EDIT_FLOW_COMMENT_OFFSET_CLASS = 'mt-6'

/**
 * The kit's Step content container: every block 24 apart (`spacing/24`) —
 * header, alert, the list with its order button, the comment. `5387:99881`.
 */
export const EDIT_FLOW_STACK_CLASS = 'flex flex-col gap-6'
