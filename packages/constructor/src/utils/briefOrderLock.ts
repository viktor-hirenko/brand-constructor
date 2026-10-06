/**
 * While a brief is `in_work` the teams are already working from its orders, so
 * the author may look at an order and may drop it (by picking from the library)
 * but may not create a new one or change its answers — the server refuses that
 * too (`checkInWorkEdit`, brief-orders plan phase 1).
 */
export function isBriefOrderLocked(brandStatus: string | null | undefined): boolean {
  return brandStatus === 'in_work'
}

export interface BriefThemeOption {
  value: 'light' | 'dark'
  label: string
  disabled: boolean
}

/**
 * The «Світла / Темна тема» switch of a concept screen. A brief «В роботі»
 * keeps its theme — the server refuses the change (`checkInWorkEdit`) — so the
 * other theme is disabled and the brief's own stays shown as chosen (H-24).
 */
export function briefThemeOptions(
  mode: string | null | undefined,
  brandStatus: string | null | undefined
): BriefThemeOption[] {
  const locked = isBriefOrderLocked(brandStatus)
  const current = mode === 'dark' ? 'dark' : 'light'
  return [
    { value: 'light', label: 'Світла тема', disabled: locked && current !== 'light' },
    { value: 'dark', label: 'Темна тема', disabled: locked && current !== 'dark' },
  ]
}
