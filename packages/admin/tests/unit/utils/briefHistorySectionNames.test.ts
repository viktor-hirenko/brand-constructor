import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  BRIEF_SECTION_LABELS,
  briefSectionLabel,
  parseCeoFeedbackEventMeta,
  parsePoCommentResolvedEventMeta,
  parseSubmittedEventMeta,
} from '@brand-constructor/shared'

/*
 * DP-15450, visual components 1 — «Перейменувати крок (та змінити відповідно по
 * всьому білдеру visual components на Interface Components)».
 *
 * The wizard, the review, the CEO's screen and the printed brief were renamed
 * earlier. The brief's history in this Admin still said «Visual components»,
 * and changing the name alone would not have been enough: the server writes
 * the section's name of the day into every event, so every event already in
 * the base would have kept the old one. The key of the section is stored next
 * to the name — the key decides what the history shows, and the stored name is
 * only for rows that have no key.
 *
 * Red on the old code: the label is «Visual components», and there is no
 * `briefSectionLabel` to read it through.
 */

const OLD = 'Visual components'
const NOW = 'Interface components'

describe('the brief history names the section «Interface components»', () => {
  it('the name of the section', () => {
    expect(BRIEF_SECTION_LABELS.visualComponents).toBe(NOW)
    for (const label of Object.values(BRIEF_SECTION_LABELS)) expect(label).not.toMatch(/visual/i)
  })

  it('a brief sent BEFORE the rename: the author’s comment to the section', () => {
    const meta = parseSubmittedEventMeta({
      summary: {},
      poComments: [
        { section: 'visualComponents', sectionLabel: OLD, excerpt: 'Хедер як у Wonka', fromExcerpt: 'Хедер' },
        { section: 'deliverables', sectionLabel: 'Deliverables', excerpt: 'До 15.11' },
      ],
    })

    expect(meta?.poComments).toEqual([
      { section: 'visualComponents', sectionLabel: NOW, excerpt: 'Хедер як у Wonka', fromExcerpt: 'Хедер' },
      { section: 'deliverables', sectionLabel: 'Deliverables', excerpt: 'До 15.11' },
    ])
  })

  it('a brief returned BEFORE the rename: the CEO’s comment to the section', () => {
    const { comments } = parseCeoFeedbackEventMeta({
      comments: [
        { section: 'visualComponents', sectionLabel: OLD, excerpt: 'Інший таббар' },
        { section: 'concept', sectionLabel: 'Concept', excerpt: 'Не той настрій' },
        { section: 'general', sectionLabel: 'General', excerpt: 'Загалом добре' },
      ],
    })

    expect(comments.map(c => c.sectionLabel)).toEqual([NOW, 'Concept', 'General'])
    expect(comments[0].excerpt).toBe('Інший таббар')
  })

  it('«Вирішено» pressed BEFORE the rename', () => {
    expect(
      parsePoCommentResolvedEventMeta({ section: 'visualComponents', sectionLabel: OLD, resolved: true })
    ).toEqual({ section: 'visualComponents', sectionLabel: NOW, resolved: true })
  })

  it('every other section keeps the name it had', () => {
    for (const [section, label] of Object.entries(BRIEF_SECTION_LABELS)) {
      expect(briefSectionLabel(section, 'whatever the event says')).toBe(label)
    }
  })

  it('a row with no key, or with a key nobody knows, keeps the name it was written with', () => {
    expect(briefSectionLabel(undefined, 'Legal')).toBe('Legal')
    expect(briefSectionLabel('', 'Legal')).toBe('Legal')
    expect(briefSectionLabel('legalLanding', 'Legal landing')).toBe('Legal landing')
    expect(briefSectionLabel('legalLanding')).toBe('legalLanding')
    // Not a section, although every object has it.
    expect(briefSectionLabel('constructor', 'Legal')).toBe('Legal')
    expect(briefSectionLabel('toString')).toBe('toString')

    expect(parsePoCommentResolvedEventMeta({ sectionLabel: 'Legal', resolved: false })).toEqual({
      section: '',
      sectionLabel: 'Legal',
      resolved: false,
    })
    expect(parseCeoFeedbackEventMeta({ comments: [{ sectionLabel: 'Legal', excerpt: 'x' }] }).comments[0].sectionLabel).toBe(
      'Legal'
    )
  })

  it('nothing that writes or shows the history still spells the old name', () => {
    const root = resolve(__dirname, '../../../..')
    for (const file of [
      'shared/src/constants/workflow.ts',
      'shared/src/types/workflow-meta.ts',
      'worker/src/utils/brand-workflow.ts',
      'admin/src/composables/useWorkflowTimeline.ts',
      'admin/src/components/brands/BrandWorkflowHistoryModal.vue',
    ]) {
      const code = readFileSync(resolve(root, file), 'utf8')
      expect(code, file).not.toMatch(/['"`]Visual components['"`]/)
    }
  })
})
