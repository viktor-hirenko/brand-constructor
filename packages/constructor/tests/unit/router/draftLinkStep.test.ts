import { describe, expect, it } from 'vitest'
import { draftLinkStepRedirect } from '@/router/draftLinkStep'

// Full run 06.10, bug 1: an empty draft opened by a link without its step
// showed the review with «Бриф готовий» and an active «На погодження CEO».
describe('a draft opened by a link goes to the step it stopped at', () => {
  const draft = (currentStep: number) => ({ id: 'brand_1', status: 'draft', currentStep })

  it('a draft at step 1 opened on the review (link, F5) → step 1', () => {
    expect(draftLinkStepRedirect('brand-view-review', undefined, draft(1))).toEqual({
      path: '/constructor/step/1',
      query: { brand: 'brand_1' },
    })
  })

  it('a draft at step 5 → step 5', () => {
    expect(draftLinkStepRedirect('brand-view-review', undefined, draft(5))?.path).toBe('/constructor/step/5')
  })

  it('a draft that reached the review stays on it', () => {
    expect(draftLinkStepRedirect('brand-view-review', undefined, draft(8))).toBeNull()
  })

  it('returning to the review after «Зберегти» of a section edit stays on the review', () => {
    expect(draftLinkStepRedirect('brand-view-review', 'step-1', draft(1))).toBeNull()
  })

  it('briefs past the draft are not touched', () => {
    for (const status of ['submitted', 'needs_revision', 'approved', 'in_work']) {
      expect(draftLinkStepRedirect('brand-view-review', undefined, { id: 'b', status, currentStep: 1 })).toBeNull()
    }
  })

  it('the draft edit screens under the review are not touched', () => {
    expect(draftLinkStepRedirect('draft-edit-concept', undefined, draft(1))).toBeNull()
  })
})
