import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { computed } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import type { BrandStepData } from '@brand-constructor/shared/types'

const apiPut = vi.fn()
const apiPatch = vi.fn()
vi.mock('@/composables/useApi', () => ({
  apiPut: (...a: unknown[]) => apiPut(...a),
  apiPatch: (...a: unknown[]) => apiPatch(...a),
  apiPost: vi.fn(),
  apiGet: vi.fn(),
  apiDelete: vi.fn(),
  apiErrorStatus: () => undefined,
}))

import { useConstructorStore } from '@/stores/constructor'
import { isExternalNamingMissing } from '@/utils/briefCompleteness'
import { attentionBannerTitle } from '@/utils/attentionBannerTitle'
import {
  REVISION_NEEDS_ANY_COMMENT,
  REVISION_NEEDS_COMMENT_PER_CHANGE,
} from '@/composables/useSupervisorReviewComments'

const SRC = fileURLToPath(new URL('../../../src/', import.meta.url))
const read = (path: string) => readFileSync(join(SRC, path), 'utf8')

function stepData(over: Partial<BrandStepData> = {}): BrandStepData {
  return {
    stepLayoutVersion: 2,
    brandBasics: { geo: ['UK'], launchDate: '2026-11-15', linkedProduct: '', comment: '' },
    mode: 'light',
    concept: { selectedId: 'con-a', previewId: null, comment: '', newConceptBrief: null },
    externalNaming: { selectedIds: ['exn-a'], comment: '', newNamingBrief: null },
    internalNaming: { selectedId: 'inn-a', comment: '', newNamingFeedback: null },
    marketingPackage: { selectedId: null, comment: '' },
    deliverables: { legalLanding: false, partnerLanding: false, developmentDeadline: '', comment: '' },
    visualComponents: { selections: {}, delegateToDesigners: false, comment: '' },
    ...over,
  }
}

describe('H-02: Final review does not send a brief without External Naming (D-12)', () => {
  it('a library concept with no names and no order for them — missing', () => {
    expect(
      isExternalNamingMissing(stepData({ externalNaming: { selectedIds: [], comment: '', newNamingBrief: null } }))
    ).toBe(true)
  })

  it('names picked, names ordered, or the concept itself ordered — not missing', () => {
    expect(isExternalNamingMissing(stepData())).toBe(false)
    expect(
      isExternalNamingMissing(
        stepData({
          externalNaming: { selectedIds: [], comment: '', newNamingBrief: { description: 'x' } as never },
        })
      )
    ).toBe(false)
    expect(
      isExternalNamingMissing(
        stepData({
          concept: { selectedId: null, previewId: null, comment: '', newConceptBrief: { name: 'x' } as never },
          externalNaming: { selectedIds: [], comment: '', newNamingBrief: null },
        })
      )
    ).toBe(false)
  })

  it('the review footer goes through it, in a draft and on a returned brief', () => {
    const view = read('views/wizard/BriefReviewView.vue')
    expect(view).toContain(':submit-blocked="submitBlocked"')
    const gate = view.slice(view.indexOf('const submitBlocked = computed('), view.indexOf('const comments ='))
    expect(gate).toContain('apply.submitBlocked.value')
    expect(gate).toContain('isExternalNamingMissing(store.stepData)')
    expect(gate).toContain("'po-draft'")
    expect(gate).toContain("'po-returned'")
  })
})

describe('H-11: «Застосувати варіант CEO» brings the counter down (T-042)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    apiPut.mockReset().mockResolvedValue({ status: 'needs_revision', updatedAt: 'T2' })
    // the server answers with every comment of the brief, the toggled one resolved
    apiPatch.mockReset().mockImplementation((_url: string, body: { section: string }) => {
      const store = useConstructorStore()
      return Promise.resolve({
        ceoComments: {
          ...store.brandCeoComments,
          [body.section]: { value: 'why', resolved: true, resolvedAt: 'T2' },
        },
      })
    })
  })

  function returnedBrief() {
    const store = useConstructorStore()
    store.loadBrand('brand_1', stepData(), 8, 'needs_revision', undefined,
      {
        concept: { value: 'take mine', resolved: false, resolvedAt: null },
        externalNaming: { value: 'names too', resolved: false, resolvedAt: null },
      },
      { concept: 'con-ceo', externalNaming: ['exn-ceo'] })
    return store
  }

  it('the CEO comment of the applied section is marked resolved', async () => {
    const store = returnedBrief()
    expect(await store.applyCeoVariant('concept')).toBe(true)
    expect(apiPatch).toHaveBeenCalledWith('/api/brands/brand_1/ceo-comments/resolve', {
      section: 'concept',
      resolved: true,
    })
    // the other section still waits for the Author
    expect(apiPatch).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ section: 'externalNaming' }))
  })

  it('«Застосувати все» resolves both', async () => {
    const store = returnedBrief()
    await store.applyCeoConceptAndExternal()
    const sections = apiPatch.mock.calls.map(c => (c[1] as { section: string }).section)
    expect(sections).toEqual(['concept', 'externalNaming'])
  })

  it('nothing is resolved when the save failed', async () => {
    apiPut.mockRejectedValue(new Error('Немає звʼязку'))
    const store = returnedBrief()
    expect(await store.applyCeoVariant('concept')).toBe(false)
    expect(apiPatch).not.toHaveBeenCalled()
  })
})

describe('H-33: the CEO is told what is actually missing (T-042)', async () => {
  const mockStore = {
    brandCeoComments: null as Record<string, { value: string; resolved: boolean }> | null,
    brandCeoSelections: null as Record<string, unknown> | null,
    setCeoCommentValue: vi.fn(),
  }
  vi.doMock('@/stores/constructor', () => ({ useConstructorStore: () => mockStore }))
  vi.resetModules()
  const { useSupervisorReviewComments } = await import('@/composables/useSupervisorReviewComments')

  it('a changed section without its comment, while another has one', () => {
    mockStore.brandCeoSelections = { concept: 'con-ceo', externalNaming: ['exn-ceo'] }
    const comments = useSupervisorReviewComments({
      isPoReturnedView: computed(() => false),
      isCeoChoiceAnAlternative: () => true,
    })
    comments.handleCeoCommentBySection('concept', 'Retro Pixel fits better')
    expect(comments.validateNeedsRevision()).toEqual({ ok: false, reason: 'missing-section' })
    expect(comments.revisionWarning.value).toBe(REVISION_NEEDS_COMMENT_PER_CHANGE)
    expect(comments.revisionWarning.value).not.toContain('хоча б один')
  })

  it('no comment at all keeps its own text', () => {
    mockStore.brandCeoSelections = null
    const comments = useSupervisorReviewComments({
      isPoReturnedView: computed(() => false),
      isCeoChoiceAnAlternative: () => false,
    })
    expect(comments.validateNeedsRevision()).toEqual({ ok: false, reason: 'no-comment' })
    expect(comments.revisionWarning.value).toBe(REVISION_NEEDS_ANY_COMMENT)
  })
})

describe('H-46: «1 секція потребує уваги» (U-05)', () => {
  it.each([
    [1, '1 секція потребує уваги'],
    [2, '2 секції потребують уваги'],
    [4, '4 секції потребують уваги'],
    [5, '5 секцій потребують уваги'],
    [11, '11 секцій потребують уваги'],
    [21, '21 секція потребує уваги'],
  ])('%i → %s', (n, title) => {
    expect(attentionBannerTitle(n)).toBe(title)
  })

  it('the banner uses it', () => {
    expect(read('components/constructor/review/ReviewUnifiedView.vue')).toContain(
      'title: attentionBannerTitle(props.attentionCounter)'
    )
  })
})

describe('H-21: no request to an address the server does not have (T-045)', () => {
  function sources(dir: string): string[] {
    return readdirSync(dir).flatMap(name => {
      const path = join(dir, name)
      if (statSync(path).isDirectory()) return sources(path)
      return /\.(ts|vue)$/.test(name) ? [path] : []
    })
  }

  it('nothing in the wizard asks for one Internal Naming by id', () => {
    const offenders = sources(SRC).filter(path =>
      /api(Get|Put|Patch|Delete)[^(]*\(\s*`\/api\/namings\/internal\/\$\{/.test(readFileSync(path, 'utf8'))
    )
    expect(offenders).toEqual([])
  })
})
