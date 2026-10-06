import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { BrandStepData } from '@brand-constructor/shared/types'
import { isOwnVariantKept, keepOwnVariant, forgetOwnVariant } from '@/utils/revisionKeptOwn'

/**
 * «Свій варіант» on Brief Revision (D-33, E-27, R-14 of
 * `docs/design-audit/edit-flow-scenarios.md`). The author kept their own
 * concept over the CEO's; the mark lived in one browser for 24 hours, so on
 * another computer or the next day the section asked for a choice again and
 * «На погодження CEO» stayed shut. The mark is now part of the brief's step
 * data (saved with the brief) and holds for the CEO alternative it answered.
 */

const SRC = resolve(__dirname, '../../../../src')
const read = (rel: string) => readFileSync(resolve(SRC, rel), 'utf8')

function stepData(): BrandStepData {
  return {
    stepLayoutVersion: 2,
    brandBasics: { geo: ['UK'], launchDate: '2026-11-15', linkedProduct: '', comment: '' },
    mode: 'light',
    concept: { selectedId: 'con-mine', previewId: null, comment: '', newConceptBrief: null },
    externalNaming: { selectedIds: ['exn-a', 'exn-b'], comment: '', newNamingBrief: null },
    internalNaming: { selectedId: 'inn-mine', comment: '', newNamingFeedback: null },
    marketingPackage: { selectedId: null, comment: '' },
    deliverables: { legalLanding: false, partnerLanding: false, developmentDeadline: '', comment: '' },
    visualComponents: { selections: {}, delegateToDesigners: true, comment: '' },
  }
}

describe('the mark travels with the brief', () => {
  it('a brief saved with the mark, opened on another computer, keeps the answer', () => {
    const ceo = { concept: 'con-ceo', externalNaming: ['exn-y', 'exn-x'] }
    const saved = stepData()
    keepOwnVariant(saved, 'concept', ceo)
    keepOwnVariant(saved, 'externalNaming', ceo)

    const elsewhere = JSON.parse(JSON.stringify(saved)) as BrandStepData
    expect(isOwnVariantKept(elsewhere, 'concept', ceo)).toBe(true)
    expect(isOwnVariantKept(elsewhere, 'externalNaming', { externalNaming: ['exn-x', 'exn-y'] })).toBe(true)
  })

  it('a different CEO alternative is a new question (R-14)', () => {
    const data = stepData()
    keepOwnVariant(data, 'concept', { concept: 'con-ceo' })
    expect(isOwnVariantKept(data, 'concept', { concept: 'con-ceo-2' })).toBe(false)
  })

  it('no mark — no answer; a forgotten mark is gone', () => {
    const data = stepData()
    expect(isOwnVariantKept(data, 'internalNaming', { internalNaming: 'inn-ceo' })).toBe(false)
    keepOwnVariant(data, 'internalNaming', { internalNaming: 'inn-ceo' })
    forgetOwnVariant(data, ['internalNaming'])
    expect(isOwnVariantKept(data, 'internalNaming', { internalNaming: 'inn-ceo' })).toBe(false)
    expect(data.revisionKeptOwn).toBeUndefined()
  })
})

describe('the screens read and write the saved mark', () => {
  it('«Застосовано» of each section accepts the saved mark', () => {
    const variants = read('composables/useSupervisorApplyVariants.ts')
    for (const section of ['concept', 'externalNaming', 'internalNaming']) {
      expect(variants).toContain(`isOwnVariantKept(store.stepData, '${section}', store.brandCeoSelections)`)
    }
  })

  it('the store writes the mark into the brief when a section is resolved with an own choice', () => {
    const facade = read('stores/constructor/index.ts')
    expect(facade).toMatch(/function markConflictSectionResolved\(section: string\) \{[\s\S]*?keepOwnVariant\(/)
  })

  it('Internal and External mark before the save, so the mark is saved with it', () => {
    for (const view of ['RevisionInternalNamingView.vue', 'RevisionExternalNamingView.vue']) {
      const src = read(`views/revision-response/${view}`)
      const save = src.slice(src.indexOf('async function goSave()'))
      expect(save.indexOf('markConflictSectionResolved')).toBeLessThan(save.indexOf('store.saveBrand()'))
      expect(save).toMatch(/unmarkConflictSections\(/)
    }
  })
})
