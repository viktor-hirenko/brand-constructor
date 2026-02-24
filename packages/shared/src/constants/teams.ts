export const PR_TEAMS = [
  'PR',
  'Retention',
  'Design',
  'Copy',
  'SMM',
  'Creative',
  'Makeberry Aff',
  'Risk',
  'Legal',
] as const

export type PrTeam = (typeof PR_TEAMS)[number]
