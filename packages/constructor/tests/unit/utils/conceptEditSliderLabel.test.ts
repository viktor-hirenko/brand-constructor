import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  CEO_CHOICE_LABEL,
  CHOSEN_CONCEPT_LABEL,
  PREVIOUS_CHOICE_LABEL,
  conceptEditSliderLabel,
} from '@/utils/conceptEditSliderLabel'

/*
 * Owner 29.09 on the draft concept-edit screen (Final review → «Редагувати»):
 * no badge on entry, and «Ваш попередній вибір» appeared on the NEW pick. The
 * design `5387:99707` shows «Обраний концепт» on the ticked concept; the
 * previous/CEO wording belongs to the CEO revision flow only.
 */
describe('concept-edit slider label', () => {
  describe('draft — brief not sent yet', () => {
    const base = { mode: 'draft' as const, ceoConceptId: null }

    it('labels the ticked concept on entry, before anything is browsed', () => {
      expect(conceptEditSliderLabel({ ...base, previewId: null, selectedId: 'con_a' })).toBe(CHOSEN_CONCEPT_LABEL)
    })

    it('moves the label with the tick when another concept is picked', () => {
      expect(conceptEditSliderLabel({ ...base, previewId: 'con_b', selectedId: 'con_b' })).toBe(CHOSEN_CONCEPT_LABEL)
    })

    it('shows no label on a concept that is only being looked at', () => {
      expect(conceptEditSliderLabel({ ...base, previewId: 'con_b', selectedId: 'con_a' })).toBeNull()
    })

    it('never says «previous choice» or «CEO choice» in a draft', () => {
      for (const previewId of [null, 'con_a', 'con_b']) {
        for (const selectedId of [null, 'con_a', 'con_b']) {
          const label = conceptEditSliderLabel({ mode: 'draft', previewId, selectedId, ceoConceptId: 'con_a' })
          expect(label).not.toBe(PREVIOUS_CHOICE_LABEL)
          expect(label).not.toBe(CEO_CHOICE_LABEL)
        }
      }
    })

    it('shows nothing when nothing is ticked', () => {
      expect(conceptEditSliderLabel({ ...base, previewId: null, selectedId: null })).toBeNull()
    })
  })

  describe('revision — back from the CEO, unchanged', () => {
    const base = { mode: 'revision' as const, selectedId: 'con_po', ceoConceptId: 'con_ceo' }

    it('names the CEO pick', () => {
      expect(conceptEditSliderLabel({ ...base, previewId: 'con_ceo' })).toBe(CEO_CHOICE_LABEL)
    })

    it('names the author’s earlier pick', () => {
      expect(conceptEditSliderLabel({ ...base, previewId: 'con_po' })).toBe(PREVIOUS_CHOICE_LABEL)
    })

    it('stays silent until something is browsed, and on any other concept', () => {
      expect(conceptEditSliderLabel({ ...base, previewId: null })).toBeNull()
      expect(conceptEditSliderLabel({ ...base, previewId: 'con_x' })).toBeNull()
    })
  })
})

describe('wizard header step on the draft-edit screens', () => {
  const router = readFileSync(resolve(__dirname, '../../../src/router/index.ts'), 'utf8')
  const shell = readFileSync(resolve(__dirname, '../../../src/views/BriefShellView.vue'), 'utf8')

  it('shows the step being edited, not Final review — «2/8» and «3/8» in 5387:99050', () => {
    expect(router).toContain("meta: { step: 8, headerStep: 2, draftEdit: true, title: 'Редагувати концепт'")
    expect(router).toContain("meta: { step: 8, headerStep: 3, draftEdit: true, title: 'Редагувати External Naming'")
  })

  it('feeds the header from headerStep, leaving the flow on meta.step', () => {
    expect(shell).toContain(':current-step="wizardHeaderStep"')
    expect(shell).toContain('isNamedHeader.value ? undefined : headerStep.value')
    expect(shell).toMatch(/const headerStep = computed\(\(\) => \(route\.meta\.headerStep as number \| undefined\) \?\? currentStep\.value\)/)
    expect(shell).toContain('const currentStep = computed(() => (route.meta.step as number) || 1)')
  })
})
