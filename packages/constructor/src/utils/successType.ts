export type SuccessType = 'saved' | 'in_work' | 'submitted' | 'needs_revision' | 'approved'

/** Which «done» screen (`BrandSuccessView`) follows a status the author or CEO just set. */
export function successTypeFromStatus(status: string): SuccessType {
  if (status === 'in_work') return 'in_work'
  if (status === 'submitted') return 'submitted'
  if (status === 'needs_revision') return 'needs_revision'
  if (status === 'approved') return 'approved'
  return 'saved'
}
