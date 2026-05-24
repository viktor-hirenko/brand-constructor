export const STATUS_PILL_BADGE_OUTER_CLASS =
  'status-pill-badge inline-flex rounded-full border border-solid p-1'

export const STATUS_PILL_BADGE_INNER_CLASS =
  'status-pill-badge__inner inline-flex items-center gap-1 px-0.5 py-0'

export const STATUS_PILL_BADGE_LABEL_CLASS =
  'status-pill-badge__label text-xs font-medium leading-4 tracking-[-0.3125px] whitespace-nowrap'

export const STATUS_PILL_BADGE_ICON_CLASS =
  'status-pill-badge__icon flex size-4 shrink-0 items-center justify-center rounded-full bg-[#DCA100] text-[9px] font-bold leading-none text-white'

export type StatusPillLeading = 'none' | 'attention'

export type StatusPillTone =
  | 'brief-submitted'
  | 'brief-revision'
  | 'brief-approved'
  | 'section-attention'

export interface StatusPillToneMeta {
  surfaceClass: string
  leading: StatusPillLeading
}

export function resolveStatusPillTone(tone: StatusPillTone): StatusPillToneMeta {
  switch (tone) {
    case 'brief-submitted':
      return {
        surfaceClass: 'bg-[#d7ecff] border-[#cee5f9] text-[#0048ef]',
        leading: 'none',
      }
    case 'brief-revision':
      return {
        surfaceClass: 'bg-[#fff9db] border-[#feebb4] text-[#916c00]',
        leading: 'none',
      }
    case 'brief-approved':
      return {
        surfaceClass: 'bg-[#f0fdf4] border-transparent text-[#15803d]',
        leading: 'none',
      }
    case 'section-attention':
      return {
        surfaceClass: 'bg-[#fff9db] border-[#feebb4] text-[#936c00]',
        leading: 'attention',
      }
  }
}
