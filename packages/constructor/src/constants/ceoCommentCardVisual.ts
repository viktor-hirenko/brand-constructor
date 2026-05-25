/**
 * CEO comment card + resolve actions — Figma Brand-Builder 1979:1533 / Comment component.
 */

export const CEO_COMMENT_CARD_BG = 'rgba(217,217,217,0.2)'
export const CEO_COMMENT_UNRESOLVED_ACCENT = '#4882ff'
export const CEO_COMMENT_LABEL_COLOR = '#5b5b62'
export const CEO_COMMENT_VALUE_COLOR = '#3d3d3d'

export const CEO_COMMENT_RESOLVE_BUTTON_BASE_CLASS =
  'inline-flex items-center self-start justify-center rounded-[8px] border border-solid p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50'

export const CEO_COMMENT_RESOLVE_BUTTON_WHITE_CLASS =
  'border-[rgba(0,0,0,0.1)] bg-[#ffffff] hover:bg-[rgba(0,0,0,0.03)]'

export const CEO_COMMENT_RESOLVE_BUTTON_HOVER_CLASS =
  'border-[rgba(0,0,0,0.1)] bg-[#ededed] hover:bg-[#e4e4e4]'

export const CEO_COMMENT_RESOLVE_BUTTON_LABEL_CLASS =
  'px-1 text-[14px] font-medium leading-4 tracking-[-0.3125px] text-[#373737]'

/** Secondary outline action (e.g. «Застосувати варіант CEO»). */
export const REVIEW_SECONDARY_ACTION_BUTTON_CLASS = [
  CEO_COMMENT_RESOLVE_BUTTON_BASE_CLASS,
  'w-full',
  CEO_COMMENT_RESOLVE_BUTTON_WHITE_CLASS,
].join(' ')

/**
 * Wide full-width outline button «Застосувати варіант CEO».
 * Matches Figma node 1979:1067 — 12 px padding, white bg, rounded-8.
 */
export const REVIEW_APPLY_VARIANT_BUTTON_CLASS = [
  'inline-flex items-center self-start justify-center rounded-[8px] border border-solid p-3 transition-colors disabled:cursor-not-allowed disabled:opacity-50',
  'w-full',
  CEO_COMMENT_RESOLVE_BUTTON_WHITE_CLASS,
].join(' ')

/**
 * Label inside «Застосувати варіант CEO» — 16 px / 24 lh / #0a0a0a.
 * Figma node 1979:1069.
 */
export const REVIEW_APPLY_VARIANT_LABEL_CLASS =
  'px-2 text-[16px] font-medium leading-6 tracking-[-0.3125px] text-[#0a0a0a] whitespace-nowrap'
