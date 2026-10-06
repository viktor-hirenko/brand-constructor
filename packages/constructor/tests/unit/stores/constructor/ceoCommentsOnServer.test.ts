import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { Brand, BrandCeoComments, BrandStepData } from '@brand-constructor/shared/types'

vi.mock('@/composables/useApi', () => ({
  apiPut: vi.fn(),
  apiPost: vi.fn(),
  apiGet: vi.fn(),
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
  apiErrorStatus: (err: unknown) => (err as { status?: number })?.status,
}))

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { apiPatch } from '@/composables/useApi'
import { useConstructorStore } from '@/stores/constructor'

/**
 * The CEO's comments before «Повернути» (H-04, run 02.10: D-24; H-30, D-63).
 * They lived in the CEO's browser only: another computer showed none, a second
 * tab lost them to the first tab's return. Each comment now goes to the server
 * (`PATCH /:id/ceo-comments`) shortly after the CEO stops typing; the decision
 * waits for what is still on its way.
 */

const ID = 'brand_ceo'
const patch = vi.mocked(apiPatch)

function stepData(): BrandStepData {
  return {
    stepLayoutVersion: 2,
    brandBasics: { geo: ['UK'], launchDate: '2026-11-15', linkedProduct: '', comment: '' },
    mode: 'light',
    concept: { selectedId: 'con-wonka', previewId: null, comment: '', newConceptBrief: null },
    externalNaming: { selectedIds: ['exn-joymus'], comment: '', newNamingBrief: null },
    internalNaming: { selectedId: 'inn-luna', comment: '', newNamingFeedback: null },
    marketingPackage: { selectedId: null, comment: '' },
    deliverables: { legalLanding: false, partnerLanding: false, developmentDeadline: '', comment: '' },
    visualComponents: { selections: {}, delegateToDesigners: true, comment: '' },
  }
}

function open(status = 'submitted', comments: BrandCeoComments | null = null) {
  const store = useConstructorStore()
  store.loadBrand(ID, stepData(), 8, status, 'New Brand #7', comments, null, null, 'v1')
  return store
}

const commentCalls = () =>
  patch.mock.calls.filter(([url]) => url === `/api/brands/${ID}/ceo-comments`)

function serverAnswers(comments: BrandCeoComments | null) {
  patch.mockImplementation(async () => ({ id: ID, ceoComments: comments }) as unknown as Brand)
}

let storage: Map<string, string>

beforeEach(() => {
  vi.useFakeTimers()
  setActivePinia(createPinia())
  patch.mockReset()
  storage = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => void storage.set(k, v),
    removeItem: (k: string) => void storage.delete(k),
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('a CEO comment reaches the server while the CEO types (H-04)', () => {
  it('one request per section after typing stops, with the final text', async () => {
    serverAnswers({ concept: { value: 'Темніше', resolved: false, resolvedAt: null } })
    const store = open()
    store.setCeoCommentValue('concept', 'Тем')
    store.setCeoCommentValue('concept', 'Темніше')
    await vi.runAllTimersAsync()

    expect(commentCalls()).toEqual([
      [`/api/brands/${ID}/ceo-comments`, { section: 'concept', value: 'Темніше' }],
    ])
  })

  it('an emptied comment is removed on the server too', async () => {
    serverAnswers(null)
    const store = open('submitted', { concept: { value: 'x', resolved: false, resolvedAt: null } })
    store.setCeoCommentValue('concept', '')
    await vi.runAllTimersAsync()

    expect(commentCalls()).toEqual([
      [`/api/brands/${ID}/ceo-comments`, { section: 'concept', value: '' }],
    ])
  })

  it('the decision first sends what is still waiting', async () => {
    serverAnswers({ general: { value: 'Ок', resolved: false, resolvedAt: null } })
    const store = open()
    store.setCeoCommentValue('general', 'Ок')
    expect(commentCalls()).toHaveLength(0)

    await store.flushCeoCommentSaves()

    expect(commentCalls()).toHaveLength(1)
  })

  it('a comment the other tab saved shows up here after this tab saves', async () => {
    serverAnswers({
      concept: { value: 'тут', resolved: false, resolvedAt: null },
      internalNaming: { value: 'з іншої вкладки', resolved: false, resolvedAt: null },
    })
    const store = open()
    store.setCeoCommentValue('concept', 'тут')
    await vi.runAllTimersAsync()

    expect(store.brandCeoComments?.internalNaming?.value).toBe('з іншої вкладки')
    expect(store.brandCeoComments?.concept?.value).toBe('тут')
  })

  it('a comment typed during the save is not overwritten by the answer', async () => {
    let answer!: (b: Brand) => void
    patch.mockImplementationOnce(() => new Promise<Brand>(r => (answer = r)))
    const store = open()
    store.setCeoCommentValue('concept', 'перше')
    await vi.advanceTimersByTimeAsync(1000)
    store.setCeoCommentValue('concept', 'перше і друге')
    answer({ id: ID, ceoComments: { concept: { value: 'перше', resolved: false, resolvedAt: null } } } as unknown as Brand)
    await vi.advanceTimersByTimeAsync(0)

    expect(store.brandCeoComments?.concept?.value).toBe('перше і друге')
  })

  it('nothing goes to the server outside «На розгляді»', async () => {
    const store = open('needs_revision')
    store.setCeoCommentValue('concept', 'x')
    await vi.runAllTimersAsync()
    expect(commentCalls()).toHaveLength(0)
  })

  it('a save that failed stays in the browser and comes back after F5', async () => {
    patch.mockRejectedValue(new Error('Немає звʼязку'))
    const store = open()
    store.setCeoCommentValue('concept', 'офлайн')
    await vi.runAllTimersAsync()

    setActivePinia(createPinia())
    const reopened = open('submitted', { general: { value: 'з сервера', resolved: false, resolvedAt: null } })
    reopened.restoreSupervisorCommentsFromStorage(ID)

    expect(reopened.brandCeoComments?.concept?.value).toBe('офлайн')
    expect(reopened.brandCeoComments?.general?.value).toBe('з сервера')
  })

  it('a saved comment leaves nothing in the browser to override the server later', async () => {
    serverAnswers({ concept: { value: 'збережено', resolved: false, resolvedAt: null } })
    const store = open()
    store.setCeoCommentValue('concept', 'збережено')
    await vi.runAllTimersAsync()

    setActivePinia(createPinia())
    const elsewhereEdited = { concept: { value: 'змінено на іншому компʼютері', resolved: false, resolvedAt: null } }
    const reopened = open('submitted', elsewhereEdited)
    reopened.restoreSupervisorCommentsFromStorage(ID)

    expect(reopened.brandCeoComments?.concept?.value).toBe('змінено на іншому компʼютері')
  })
})

describe('the screens wait for the comments and keep them to the CEO', () => {
  const read = (rel: string) =>
    readFileSync(resolve(__dirname, '../../../../src', rel), 'utf8')

  it('«Повернути» / «Затвердити» send the waiting comments before the decision', () => {
    const view = read('views/wizard/BriefReviewView.vue')
    const flush = view.indexOf('await store.flushCeoCommentSaves()')
    expect(flush).toBeGreaterThan(-1)
    expect(flush).toBeLessThan(view.indexOf('/api/brands/${store.brandId}/status'))
  })

  it('unsent CEO comments come back after F5 only for the CEO', () => {
    expect(read('router/index.ts')).toMatch(
      /if \(useAuthStore\(\)\.isCeo\) store\.restoreSupervisorCommentsFromStorage\(brandId\)/
    )
  })
})
