import { describe, expect, it } from 'vitest'
import {
  authorSubmitTarget,
  canEnterDraftEdit,
  isInWorkReadyForCeo,
  isSectionEditableInMode,
} from '@/utils/inWorkReview'
import { isBriefOrderLocked } from '@/utils/briefOrderLock'

/**
 * Brief «В роботі» (brief-orders plan, phase 1) on the author's side.
 * H-01: the author could not bring such a brief to the CEO at all.
 */

describe('in_work — what the author may edit on the Final review', () => {
  it('only the ordered sections: Concept, External and Internal Naming', () => {
    for (const key of ['concept', 'externalNaming', 'internalNaming']) {
      expect(isSectionEditableInMode('po-in-work', key)).toBe(true)
    }
    for (const key of ['basics', 'marketingPackage', 'deliverables', 'visualComponents']) {
      expect(isSectionEditableInMode('po-in-work', key)).toBe(false)
    }
  })

  it('draft and returned briefs stay fully editable; CEO, submitted and approved do not', () => {
    for (const key of ['basics', 'concept', 'visualComponents']) {
      expect(isSectionEditableInMode('po-draft', key)).toBe(true)
      expect(isSectionEditableInMode('po-returned', key)).toBe(true)
      expect(isSectionEditableInMode('ceo', key)).toBe(false)
      expect(isSectionEditableInMode('po-submitted', key)).toBe(false)
      expect(isSectionEditableInMode('approved', key)).toBe(false)
    }
  })
})

describe('in_work — «На погодження CEO» is available only for a whole brief', () => {
  const whole = { hasNewBrief: false, hasConcept: true, externalCount: 1, hasInternal: true }

  it('ready when nothing is on order and concept, names and internal name are picked', () => {
    expect(isInWorkReadyForCeo(whole)).toBe(true)
  })

  it('not ready while anything is still on order', () => {
    expect(isInWorkReadyForCeo({ ...whole, hasNewBrief: true })).toBe(false)
  })

  it('not ready without a concept, an External Naming or an Internal Naming (H-02)', () => {
    expect(isInWorkReadyForCeo({ ...whole, hasConcept: false })).toBe(false)
    expect(isInWorkReadyForCeo({ ...whole, externalCount: 0 })).toBe(false)
    expect(isInWorkReadyForCeo({ ...whole, hasInternal: false })).toBe(false)
  })
})

describe('where the author footer sends the brief', () => {
  it('a draft with an order goes to the teams', () => {
    expect(authorSubmitTarget('po-draft', true)).toBe('in_work')
  })

  it('a draft without one, a brief in work and a returned brief go to the CEO', () => {
    expect(authorSubmitTarget('po-draft', false)).toBe('submitted')
    expect(authorSubmitTarget('po-in-work', false)).toBe('submitted')
    expect(authorSubmitTarget('po-in-work', true)).toBe('submitted')
    expect(authorSubmitTarget('po-returned', false)).toBe('submitted')
  })
})

describe('draft edit-flow entry is decided by status, not by the order (H-01)', () => {
  it('the author of a draft or in_work brief enters', () => {
    expect(canEnterDraftEdit({ isCeo: false, brandStatus: 'draft' })).toBe(true)
    // in_work after the ordered concept was swapped for a library pick: no order left in the store
    expect(canEnterDraftEdit({ isCeo: false, brandStatus: 'in_work' })).toBe(true)
  })

  it('nobody else enters', () => {
    expect(canEnterDraftEdit({ isCeo: true, brandStatus: 'in_work' })).toBe(false)
    for (const status of ['submitted', 'needs_revision', 'approved']) {
      expect(canEnterDraftEdit({ isCeo: false, brandStatus: status })).toBe(false)
    }
  })
})

describe('order in a brief in work is view-only', () => {
  it('locked only in in_work', () => {
    expect(isBriefOrderLocked('in_work')).toBe(true)
    for (const status of ['draft', 'submitted', 'needs_revision', 'approved', null]) {
      expect(isBriefOrderLocked(status)).toBe(false)
    }
  })
})

describe('the «done» screen after «Відправити в роботу»', () => {
  it('in_work has its own success type, not «saved» or «submitted»', async () => {
    const { successTypeFromStatus } = await import('@/utils/successType')
    expect(successTypeFromStatus('in_work')).toBe('in_work')
    expect(successTypeFromStatus('submitted')).toBe('submitted')
    expect(successTypeFromStatus('draft')).toBe('saved')
  })
})

describe('External Naming while a new concept is ordered (v2-prd:151-152)', () => {
  it('has no «Редагувати» in a draft or in work — names come with a library concept', () => {
    expect(isSectionEditableInMode('po-draft', 'externalNaming', { conceptOrdered: true })).toBe(false)
    expect(isSectionEditableInMode('po-in-work', 'externalNaming', { conceptOrdered: true })).toBe(false)
  })

  it('is editable again once a library concept is picked; Concept itself always is', () => {
    expect(isSectionEditableInMode('po-in-work', 'externalNaming', { conceptOrdered: false })).toBe(true)
    expect(isSectionEditableInMode('po-in-work', 'concept', { conceptOrdered: true })).toBe(true)
    expect(isSectionEditableInMode('po-draft', 'externalNaming')).toBe(true)
  })
})
