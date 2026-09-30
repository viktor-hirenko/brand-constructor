import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * CEO view `5387:78989` / `5387:83810`, owner 30.09: header and the
 * «Загальний коментар» block did not match the drawing.
 */

const SRC = fileURLToPath(new URL('../../../../src/', import.meta.url))
const read = (path: string): string => readFileSync(`${SRC}${path}`, 'utf8')
const code = (path: string): string =>
  read(path).replace(/\/\*\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/^\s*\/\/.*$/gm, '')

const shell = code('views/BriefShellView.vue')
const review = code('components/constructor/review/ReviewUnifiedView.vue')
const block = code('components/constructor/fields/SectionCommentBlock.vue')

describe('CEO header — «Brief Review», no counter, no progress', () => {
  it('titles the CEO screens «Brief Review»', () => {
    expect(shell).toContain('isSupervisorReview.value || isAlternativeSelection.value')
    expect(shell).toContain("isCeoHeader.value ? 'Brief Review' : isRevisionHeader.value ? 'Brief Revision' : undefined")
    expect(shell).toContain(':title="wizardHeaderTitle"')
  })

  it('passes no step to the header there, which drops the «8/8» badge and the black fill', () => {
    expect(shell).toContain('isNamedHeader.value ? undefined : headerStep.value')
    expect(shell).toContain('isNamedHeader.value ? undefined : totalSteps')
    expect(shell).toContain(':total-steps="wizardHeaderTotal"')
  })
})

describe('«Загальний коментар» — label 8 above the field', () => {
  it('stacks label and field with gap 8, no space-y margins', () => {
    expect(review).toContain('review-unified-view__general-comment-ceo flex flex-col gap-2')
    expect(review).not.toContain('general-comment-ceo space-y-3')
  })

  it('keeps the in-card 16 off the general field', () => {
    expect(block).toContain("alwaysExpanded ? 'section-comment flex flex-col gap-2' : 'section-comment mt-4 flex flex-col gap-2'")
  })

  it('spells the placeholder with three dots, as drawn', () => {
    expect(review).toContain('Додайте ваші коментарі або побажання...')
    expect(block).not.toContain('побажання…')
  })
})

describe('CEO reselect — «Вибір замовника» card', () => {
  it('takes a third of the column (170.3 at 527), not a fixed 162', async () => {
    const { EDIT_FLOW_AUTHOR_PICK_CARD_CLASS } = await import('@/constants/editFlowLayout')
    expect(EDIT_FLOW_AUTHOR_PICK_CARD_CLASS).toBe('w-[calc((100%-1rem)/3)]')
    const preview = code('components/constructor/alternative-selection/AuthorPickPreview.vue')
    expect(preview).toContain('EDIT_FLOW_AUTHOR_PICK_CARD_CLASS')
    expect(preview).not.toContain('10.125rem')
    expect(code('components/constructor/skeletons/AuthorPickPreviewSkeleton.vue')).not.toContain('162px')
  })
})

describe('«Коментар CEO» in a section rests as the kit Comment', () => {
  it('shows a written CEO comment with UiComment, like «Коментар замовника»', () => {
    expect(block).toContain('v-else-if="!alwaysExpanded && hasSupervisorComment && !isEditing"')
    expect(block).toContain('label="Коментар CEO"')
    expect(block).toContain('class="section-comment__ceo-comment')
  })

  it('turns back into the field on click and back into the Comment on blur', () => {
    expect(block).toMatch(/function openEditor\(\) \{[\s\S]*?isEditing\.value = true/)
    expect(block).toMatch(/function onBlur\(\) \{[\s\S]*?isEditing\.value = false/)
    expect(block).toContain('@click="openEditor"')
  })
})

describe('«Коментар CEO» editor in a section does not jump on click', () => {
  it('drops the Area floor of 96 for the in-card editor only', () => {
    expect(read('components/constructor/fields/SectionCommentBlock.vue')).toContain("const CEO_SECTION_EDITOR_FLOOR_CLASS = 'min-h-0!'")
    expect(block).toContain("alwaysExpanded ? '' : CEO_SECTION_EDITOR_FLOOR_CLASS")
  })
})

describe('autosize textarea — the measured height is the size', () => {
  it('stops the flex-1 control from flexing once autosize sets a height', () => {
    // flex-1 = basis 0: in the Area's column it overrode `style.height`, so a
    // six-line comment rendered at three lines with the rest hidden.
    const textarea = read('components/ui/UiTextarea.vue')
    expect(textarea).toMatch(/el\.style\.height = `\$\{heightPx\}px`[\s\S]*?el\.style\.flex = 'none'/)
  })
})

describe('step 7 «Довірити вибір дизайнерам» — `5382:70251`', () => {
  const view = code('views/wizard/VisualComponentsView.vue')
  it('draws a black inner stroke while delegated, grey otherwise, inside the 56', () => {
    expect(view).toContain("isDelegated ? 'outline-primary' : 'outline-ink-300'")
    expect(view).toContain('outline outline-1 -outline-offset-1')
    expect(view).not.toContain('overflow-hidden rounded-2xl border border-ink-300')
  })

  it('writes the phone caption 12/16 in #6f6f7d in a 170 column', () => {
    const empty = code('components/constructor/preview/VisualComponentsPhoneEmptyState.vue')
    expect(empty).toContain('max-w-[10.625rem] text-xs/4 text-ink-700')
    expect(empty).not.toContain('text-white/45')
  })
})

describe('author after the CEO returned the brief — `5387:105225`', () => {
  it('names every returned screen «Brief Revision», draft-edit excluded', () => {
    expect(shell).toContain("isAuthorReturned.value || String(route.name ?? '').startsWith('po-edit')")
  })

  it('shows the CEO general comment as the read-only Area, 8 under its label', () => {
    expect(review).toContain('review-unified-view__general-comment-po flex flex-col gap-2')
    expect(review).toMatch(/<UiTextarea\s+class="review-unified-view__general-comment-po-value"[\s\S]*?readonly/)
  })

  it('puts 16 between «Вибір замовника» and «Вибір CEO» in a list', () => {
    expect(code('components/constructor/review/ReviewChoiceGroup.vue')).toContain("dualOuterGap: 'gap-4'")
  })

  it('draws the grey rail on a resolved CEO comment', async () => {
    const { resolveUiCommentClasses } = await import('@/components/ui/uiComment')
    expect(resolveUiCommentClasses({ resolved: true })).toContain('border-ink-400')
    expect(resolveUiCommentClasses({ unresolved: true })).toContain('border-blue-content')
    expect(resolveUiCommentClasses({})).not.toContain('border-l-2')
  })

  it('reads «Потребує доопрацювання» on the status badge', () => {
    expect(code('components/constructor/review/brandBriefStatusBadge.ts')).toContain("'Потребує доопрацювання'")
  })
})

describe('revision External Naming after a concept change — `5395:107506`', () => {
  it('shows the «Оберіть новий External Naming» warning, only in the chained flow', () => {
    const v = code('views/revision-response/RevisionExternalNamingView.vue')
    expect(v).toMatch(/<ConceptCascadeBanner\s+v-if="isChained && !isPostApply"/)
  })
})

describe('read-only field — no hover, no focus (owner 30.09)', () => {
  it('drops the interactive classes when readonly', async () => {
    const { resolveUiFieldSurfaceClasses } = await import('@/components/ui/uiField')
    const ro = resolveUiFieldSurfaceClasses({ type: 'area', readonly: true })
    expect(ro).not.toContain('hover:')
    expect(ro).not.toContain('focus')
    expect(resolveUiFieldSurfaceClasses({ type: 'area' })).toContain('hover:bg-ink-300')
  })
})

describe('confirmation modal buttons — `1985:4936`', () => {
  it('lays the two buttons in equal grid columns and never wraps a label', () => {
    const m = code('components/ui/ConfirmationModal.vue')
    expect(m).toContain("'confirmation-modal__actions w-full gap-2 whitespace-nowrap'")
    expect(m).toContain("actionsLayout === 'stack' ? 'grid grid-cols-1' : 'grid grid-cols-2'")
  })
})

describe('resolved CEO comment button does not shake on hover (owner 30.09)', () => {
  const card = code('components/constructor/review/SupervisorCommentCard.vue')
  it('stacks «Вирішено» and «Повернути» in one grid cell, swapped by CSS hover', () => {
    expect(card).toContain('ceo-comment-card__resolved-label inline-grid')
    expect(card).toMatch(/col-start-1 row-start-1[^"]*group-hover:invisible/)
    expect(card).toMatch(/invisible col-start-1 row-start-1[^"]*group-hover:visible/)
  })
  it('no longer swaps the label text in JS — which is what changed the width', () => {
    expect(card).not.toContain("resolvedButtonHovered ? 'Повернути' : 'Вирішено'")
  })
})
