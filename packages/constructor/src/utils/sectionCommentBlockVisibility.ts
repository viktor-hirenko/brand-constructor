export interface SectionCommentBlockVisibilityInput {
  authorComment?: string
  supervisorComment?: string
  supervisorEditable: boolean
  showResolveUi?: boolean
  alwaysExpanded?: boolean
}

/** Whether SectionCommentBlock should render (avoids empty wrapper + gap on Final review). */
export function isSectionCommentBlockVisible(
  input: SectionCommentBlockVisibilityInput
): boolean {
  const hasAuthorComment = (input.authorComment ?? '').trim().length > 0
  const hasPersistedSupervisorComment = (input.supervisorComment ?? '').trim().length > 0

  return (
    hasAuthorComment ||
    input.supervisorEditable ||
    !!input.showResolveUi ||
    !!input.alwaysExpanded ||
    hasPersistedSupervisorComment
  )
}
