/**
 * Shared layout for CEO re-select and PO edit step screens (layoutMode === 'edit').
 * Horizontal inset (48px) lives in EditFlowStepShell — not on the dual-pane column.
 * Subtitle → first block: shell body gap-6 (24px) + pt-2 (8px) = 32px.
 * Divider: my-10 (40px above and below); full column width via shell :deep(.edit-flow-divider).
 */

/** Body content inset — must match former dual-pane edit px-12 (48px). */
export const EDIT_FLOW_CONTENT_INSET_CLASS = 'px-12'

export const EDIT_FLOW_BODY_OFFSET_CLASS = 'flex flex-col pt-2'

export const EDIT_FLOW_PRE_DIVIDER_GROUP_CLASS = 'flex flex-col gap-6'

export const EDIT_FLOW_DIVIDER_CLASS =
  'edit-flow-divider my-10 shrink-0 border-0 border-t border-solid border-black/10'

/** 24px from section label row (e.g. «Доступні концепти» + theme) to cards/grid. */
export const EDIT_FLOW_SECTION_TO_GRID_GAP_CLASS = 'gap-6'

export const EDIT_FLOW_POST_DIVIDER_SECTION_CLASS = `flex flex-col ${EDIT_FLOW_SECTION_TO_GRID_GAP_CLASS}`

/** 32px from cards/grid block to the comment field below (Figma edit-flow). */
export const EDIT_FLOW_GRID_TO_COMMENT_GAP_CLASS = 'mb-8'

/** Cards/grid section immediately followed by StepCommentField on reselect screens. */
export const EDIT_FLOW_CARDS_BEFORE_COMMENT_SECTION_CLASS = `${EDIT_FLOW_POST_DIVIDER_SECTION_CLASS} ${EDIT_FLOW_GRID_TO_COMMENT_GAP_CLASS}`
