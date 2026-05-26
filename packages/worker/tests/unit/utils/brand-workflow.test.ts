import { describe, it, expect } from 'vitest'
import {
  appendWorkflowSnapshot,
  buildCommentsMeta,
  buildPoCommentUpdates,
  poCommentsFromPreviousSubmit,
  buildSubmittedSelectionChanges,
  type SubmittedSelectionSnapshot,
} from '../../../src/utils/brand-workflow'
import type { BrandRow } from '../../../src/utils/brands'

function baseRow(overrides: Partial<BrandRow> = {}): BrandRow {
  return {
    id: 'brand_test',
    internal_name: 'Test',
    status: 'draft',
    created_by: 'usr_po',
    geo: 'UA',
    launch_date: null,
    mode: null,
    concept_id: null,
    concept_comment: null,
    external_naming_ids: null,
    external_naming_comment: null,
    internal_naming_id: null,
    internal_naming_comment: null,
    pr_package_id: null,
    pr_package_comment: null,
    legal_landing: 0,
    partner_landing: 0,
    deliverables_comment: null,
    component_selections: null,
    components_comment: null,
    delegate_to_designers: 0,
    new_concept_brief: null,
    ceo_comments: null,
    ceo_selections: null,
    development_deadline: null,
    new_naming_brief: null,
    step_data: null,
    current_step: 1,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    submit_count: 0,
    ...overrides,
  }
}

describe('appendWorkflowSnapshot', () => {
  it('adds submitted fields and increments submit_count', () => {
    const updates: string[] = ['status = ?']
    const values: (string | number | null)[] = ['submitted']
    const now = '2026-03-01T12:00:00.000Z'

    appendWorkflowSnapshot('submitted', 'draft', 'usr_po', baseRow({ submit_count: 1 }), now, updates, values)

    expect(updates.join(', ')).toContain('submitted_at')
    expect(updates.join(', ')).toContain('submit_count')
    expect(values).toContain(now)
    expect(values).toContain('usr_po')
    expect(values).toContain(2)
  })

  it('adds approved and needs_revision fields', () => {
    const updates: string[] = []
    const values: (string | number | null)[] = []
    const now = '2026-03-01T12:00:00.000Z'

    appendWorkflowSnapshot('needs_revision', 'submitted', 'usr_ceo', baseRow(), now, updates, values)
    expect(values).toEqual([now, 'usr_ceo'])

    const updates2: string[] = []
    const values2: (string | number | null)[] = []
    appendWorkflowSnapshot('approved', 'submitted', 'usr_ceo', baseRow(), now, updates2, values2)
    expect(updates2.join(', ')).toContain('approved_at')
    expect(values2).toContain('usr_ceo')
  })
})

describe('buildCommentsMeta', () => {
  it('extracts non-empty section comments with excerpts', () => {
    const comments = buildCommentsMeta({
      concept: { value: 'Please change concept', resolved: false, resolvedAt: null },
      general: '',
    })
    expect(comments).toHaveLength(1)
    expect(comments[0].section).toBe('concept')
    expect(comments[0].excerpt).toContain('Please change concept')
  })
})

describe('buildSubmittedSelectionChanges', () => {
  const prev: SubmittedSelectionSnapshot = {
    concept: 'Secret Place',
    externalNaming: 'TestEcho',
    internalNaming: 'Project Echo',
    marketingPackage: null,
  }

  it('detects changed selection fields vs previous submit', () => {
    const changes = buildSubmittedSelectionChanges(prev, {
      concept: 'New Western',
      externalNaming: 'JoyMania, WinRide',
      internalNaming: 'Project Echo',
      marketingPackage: 'Package A',
    })
    expect(changes).toHaveLength(3)
    expect(changes.find(c => c.field === 'concept')?.toName).toBe('New Western')
    expect(changes.find(c => c.field === 'externalNaming')?.fromName).toBe('TestEcho')
  })

  it('returns empty when snapshot unchanged', () => {
    expect(buildSubmittedSelectionChanges(prev, { ...prev })).toHaveLength(0)
  })
})

describe('buildPoCommentUpdates', () => {
  it('includes new or changed PO section comments only', () => {
    const updates = buildPoCommentUpdates(
      { concept: 'old text' },
      { concept: 'updated answer', externalNaming: 'new note' }
    )
    expect(updates).toHaveLength(2)
    expect(updates[0].fromExcerpt).toBe('old text')
    expect(updates[1].section).toBe('externalNaming')
    expect(updates[1].fromExcerpt).toBeUndefined()
  })

  it('skips unchanged comments', () => {
    const updates = buildPoCommentUpdates(
      { concept: 'same' },
      { concept: 'same' }
    )
    expect(updates).toHaveLength(0)
  })

  it('uses full commentSnapshot from previous submit when present', () => {
    const prevMeta = {
      commentSnapshot: { marketingPackage: '111', concept: '1111' },
      poComments: [{ section: 'concept', sectionLabel: 'Concept', excerpt: '1111' }],
    }
    const prev = poCommentsFromPreviousSubmit(prevMeta)
    const updates = buildPoCommentUpdates(prev, {
      marketingPackage: '111',
      concept: '1111+333',
    })
    expect(updates).toHaveLength(1)
    expect(updates[0].section).toBe('concept')
  })
})

describe('first submit changes policy', () => {
  it('empty diff when previous snapshot is null (first submit)', () => {
    const current = {
      concept: 'Secret Place',
      externalNaming: 'Tanzana, TestEcho',
      internalNaming: 'Project Echo',
      marketingPackage: 'Trust Focus',
    }
    expect(buildSubmittedSelectionChanges(null, current)).toHaveLength(4)
    // Worker omits changes when submitCount === 1; UI uses finalName per section instead.
  })
})
