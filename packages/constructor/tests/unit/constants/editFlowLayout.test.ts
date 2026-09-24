import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  EDIT_FLOW_ALERT_TO_SECTION_GAP_CLASS,
  EDIT_FLOW_BODY_OFFSET_CLASS,
  EDIT_FLOW_CARDS_BEFORE_COMMENT_SECTION_CLASS,
  EDIT_FLOW_COMMENT_OFFSET_CLASS,
  EDIT_FLOW_CONCEPT_PAIR_GRID_CLASS,
  EDIT_FLOW_CONTENT_INSET_CLASS,
  EDIT_FLOW_CONTROL_CARDS_BEFORE_COMMENT_SECTION_CLASS,
  EDIT_FLOW_CONTROL_ROW_TO_GRID_GAP_CLASS,
  EDIT_FLOW_GRID_TO_COMMENT_GAP_CLASS,
  EDIT_FLOW_POST_DIVIDER_CONTROL_SECTION_CLASS,
  EDIT_FLOW_POST_DIVIDER_SECTION_CLASS,
  EDIT_FLOW_PRE_DIVIDER_GROUP_CLASS,
  EDIT_FLOW_SECTION_TO_GRID_GAP_CLASS,
} from '@/constants/editFlowLayout'

/**
 * Guard for the edit-flow spacing scale (DP-15258 phase 18).
 *
 * Phase 17 checked every component on step 2 and did not check the distances
 * between them; the owner saw that in one look. This file pins the distances
 * for the nine edit-flow screens, each number measured off the six sections
 * the phase was given — `4492:25743`, `4492:28515`, `4492:10154`,
 * `4492:16446`, `4492:16841` and `4463:14684` — not copied from the plan.
 *
 * The screens themselves are checked by reading their sources: these are
 * template distances, and the environment has no component renderer
 * (`vitest.config.ts` is `environment: 'node'`, see the plan's «Выбранный
 * подход» §6). A screen that goes back to a hand-written number instead of the
 * constant reddens here.
 */

const SRC = resolve(__dirname, '../../../src')

function read(relative: string): string {
  return readFileSync(resolve(SRC, relative), 'utf8')
}

const EDIT_FLOW_SCREENS = [
  'views/alternative-selection/AlternativeConceptView.vue',
  'views/alternative-selection/AlternativeExternalNamingView.vue',
  'views/alternative-selection/AlternativeInternalNamingView.vue',
  'views/draft-edit/DraftConceptEditView.vue',
  'views/draft-edit/DraftExternalNamingEditView.vue',
  'views/revision-response/RevisionConceptView.vue',
  'views/revision-response/RevisionExternalNamingView.vue',
  'views/revision-response/RevisionInternalNamingView.vue',
] as const

describe('the edit-flow spacing scale is the kit’s', () => {
  it('opens a block 12 below its section label', () => {
    // `4492:27444` → `4492:27445`, `4492:29268` → `4492:29269`,
    // `4492:16109` → `4492:16355`, `4492:13066` → `4492:15655`: a 24-tall
    // label line, the list at y=36. It read 24 before this phase, while the
    // blocks above the divider on the same screens already used 12.
    expect(EDIT_FLOW_SECTION_TO_GRID_GAP_CLASS).toBe('gap-3')
  })

  it('opens the concept grid 16 below the row that carries the theme switch', () => {
    // That row is the segmented control's own 40, not a 24 line:
    // `4492:12425` → `4492:12431` at y=56, same on `4492:11569` → `4492:11575`
    // and `4492:27204` → `4492:27210`. Also 24 before this phase.
    expect(EDIT_FLOW_CONTROL_ROW_TO_GRID_GAP_CLASS).toBe('gap-4')
  })

  it('keeps 24 between two sibling blocks above the divider', () => {
    // `4492:29255`: the first sub-block ends at 196, the second opens at 220.
    expect(EDIT_FLOW_PRE_DIVIDER_GROUP_CLASS).toContain('gap-6')
  })

  it('keeps 24 between the cascade alert and the section under it', () => {
    // `4492:13140` is 112 tall, the list container opens at 136.
    expect(EDIT_FLOW_ALERT_TO_SECTION_GAP_CLASS).toBe('mb-6')
  })

  it('leaves 32 to the comment field, whichever way the screen spells it', () => {
    // `4492:29267` (ends 328) → `4492:29273` (y=360). The slot carried 24, 32
    // and 48 on three different screens before this phase; both spellings now
    // resolve to the same 32.
    expect(EDIT_FLOW_GRID_TO_COMMENT_GAP_CLASS).toBe('mb-8')
    expect(EDIT_FLOW_COMMENT_OFFSET_CLASS).toBe('mt-8')
  })

  it('stands the two concept columns 8 apart, not 16', () => {
    // `4492:27194`: a 500 container with two 246 frames at x=0 and x=254.
    expect(EDIT_FLOW_CONCEPT_PAIR_GRID_CLASS).toContain('gap-2')
    expect(EDIT_FLOW_CONCEPT_PAIR_GRID_CLASS).toContain('grid-cols-2')
  })

  it('composes the section classes out of those same gaps', () => {
    expect(EDIT_FLOW_POST_DIVIDER_SECTION_CLASS).toBe(
      `flex flex-col ${EDIT_FLOW_SECTION_TO_GRID_GAP_CLASS}`,
    )
    expect(EDIT_FLOW_POST_DIVIDER_CONTROL_SECTION_CLASS).toBe(
      `flex flex-col ${EDIT_FLOW_CONTROL_ROW_TO_GRID_GAP_CLASS}`,
    )
    expect(EDIT_FLOW_CARDS_BEFORE_COMMENT_SECTION_CLASS).toContain(
      EDIT_FLOW_GRID_TO_COMMENT_GAP_CLASS,
    )
    expect(EDIT_FLOW_CONTROL_CARDS_BEFORE_COMMENT_SECTION_CLASS).toContain(
      EDIT_FLOW_CONTROL_ROW_TO_GRID_GAP_CLASS,
    )
  })

  it('keeps every length in rem — the shell is inside the scale handle', () => {
    // «Железные правила адаптива»: a px child of an overflow-hidden shell is
    // clipped silently. `EditFlowStepShell` carried `pb-[32px]` until phase 18.
    const values = [
      EDIT_FLOW_ALERT_TO_SECTION_GAP_CLASS,
      EDIT_FLOW_BODY_OFFSET_CLASS,
      EDIT_FLOW_COMMENT_OFFSET_CLASS,
      EDIT_FLOW_CONTENT_INSET_CLASS,
      EDIT_FLOW_CONTROL_ROW_TO_GRID_GAP_CLASS,
      EDIT_FLOW_GRID_TO_COMMENT_GAP_CLASS,
      EDIT_FLOW_PRE_DIVIDER_GROUP_CLASS,
      EDIT_FLOW_SECTION_TO_GRID_GAP_CLASS,
    ]
    for (const value of values) {
      expect(value).not.toMatch(/\b\d+(\.\d+)?(px|vw|vh|dvh|em)\b/)
    }
    // Arbitrary values only — the file's prose names the 32px inset, and the
    // scoped rule spells it `2rem`, which is the point.
    expect(read('components/constructor/edit-flow/EditFlowStepShell.vue')).not.toMatch(
      /\[[\d.]+px\]/,
    )
  })
})

describe('the nine edit-flow screens read the scale instead of writing numbers', () => {
  it.each(EDIT_FLOW_SCREENS)('%s carries no hand-written column gap', file => {
    const source = read(file)
    // `gap-6` on these screens only ever meant the pre-divider group, and that
    // one comes from the constant. A literal gap class in the template is the
    // shape the phase-17 defect took.
    expect(source).not.toMatch(/class="flex flex-col gap-\d/)
    expect(source).not.toMatch(/class="[^"]*\bmt-6\b/)
  })

  it('shows the cascade alert instead of a rule hanging over nothing', () => {
    // Chained from the concept screen the customer's picks are gone, so the
    // block above the line is empty — and `4492:12592` draws the Alert there,
    // with no divider at all. The divider used to render unconditionally.
    const source = read('views/alternative-selection/AlternativeExternalNamingView.vue')
    expect(source).toContain('ConceptCascadeBanner')
    expect(source).toMatch(/v-if="isChainedFromConcept"[\s\S]{0,200}ConceptCascadeBanner|ConceptCascadeBanner[\s\S]{0,200}isChainedFromConcept/)
  })

  it('writes «Вибір замовника» once, as the shared label', () => {
    // Five hand-written copies of one line stood on these screens, in two
    // different sizes. They are one component now, so the open question about
    // its colour (divergences row 46) stays a one-line change.
    for (const file of [
      'components/constructor/alternative-selection/AuthorPickPreview.vue',
      'components/constructor/alternative-selection/AuthorNamingsRow.vue',
      'components/constructor/alternative-selection/AuthorInternalNamingPreview.vue',
    ]) {
      const source = read(file)
      expect(source).toContain('EditFlowSectionLabel')
      expect(source).not.toContain('text-sm/4 font-medium text-ink-700')
      expect(source).not.toMatch(/<p[^>]*class="[^"]*__label/)
    }
  })

  it('keeps the author pick and its skeleton on the same gap', () => {
    // They disagreed (8 against 12), so the block moved when the data arrived.
    const content = read('components/constructor/alternative-selection/AuthorPickPreview.vue')
    const skeleton = read('components/constructor/skeletons/AuthorPickPreviewSkeleton.vue')
    expect(content).toContain('EDIT_FLOW_SECTION_TO_GRID_GAP_CLASS')
    expect(skeleton).toContain(`flex flex-col ${EDIT_FLOW_SECTION_TO_GRID_GAP_CLASS}`)
  })
})

describe('the review screen the flow starts on', () => {
  it('stands the section list, the comment and the footer 24 apart', () => {
    // Phase 18 put 32 here off `4492:16845` — the canvas the nineteen-phase
    // plan was measured against. The current one says 24 on both step-8
    // screens: `5387:91764` header ends 192 / list opens 216, and `5387:83810`
    // header ends 160 / list opens 184, list ends 2583.5 / Input 2607.5, Input
    // ends 2735.5 / navigation bar 2759.5. Re-measured with the review work.
    const source = read('components/constructor/review/ReviewUnifiedView.vue')
    expect(source).toContain('review-unified-view__scroll-inner flex flex-col gap-6')
    expect(source).not.toContain('review-unified-view__scroll-inner flex flex-col gap-8')
  })

  it('keeps the cards themselves 16 apart', () => {
    // `4492:16848` is 396 tall and `4492:16849` opens at 412 — this one already
    // matched and must not drift with the change above.
    const source = read('components/constructor/review/ReviewUnifiedView.vue')
    expect(source).toContain('review-unified-view__sections space-y-4')
  })

  it('leaves the general comment outside the card list', () => {
    // The kit puts it under the list as its own Input, not as a card in it.
    const source = read('components/constructor/review/ReviewUnifiedView.vue')
    const listEnd = source.indexOf('</ReviewSection>\n        </div>')
    const generalComment = source.indexOf('review-unified-view__general-comment-po')
    expect(listEnd).toBeGreaterThan(-1)
    expect(generalComment).toBeGreaterThan(listEnd)
  })
})
