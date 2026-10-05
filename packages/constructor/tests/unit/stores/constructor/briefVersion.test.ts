import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { Brand, BrandStepData } from '@brand-constructor/shared/types'

vi.mock('@/composables/useApi', () => ({
  apiPut: vi.fn(),
  apiPost: vi.fn(),
  apiGet: vi.fn(),
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
  apiErrorStatus: (err: unknown) => (err as { status?: number })?.status,
}))

import { apiGet, apiPatch, apiPut } from '@/composables/useApi'
import { useConstructorStore } from '@/stores/constructor'
import { applyBrandToStore } from '@/utils/brandHydration'

/**
 * Two tabs of one draft (H-29, run 02.10: D-60): tab B, opened before tab A
 * saved, pressed «Далі» and silently overwrote A. Every save now carries the
 * version of the brief the tab saw — taken on open, after the tab's own save,
 * after its own «Вирішено» — and the server refuses a save over a brief
 * changed since. The refusal is the line under the buttons (portion 2).
 */

const ID = 'brand_tabs'
const put = vi.mocked(apiPut)
const patch = vi.mocked(apiPatch)
const get = vi.mocked(apiGet)

function stepData(): BrandStepData {
  return {
    stepLayoutVersion: 2,
    brandBasics: { geo: ['UK'], launchDate: '2026-11-15', linkedProduct: '', comment: '' },
    mode: 'light',
    concept: { selectedId: 'con-wonka', previewId: null, comment: '', newConceptBrief: null },
    externalNaming: { selectedIds: ['exn-joymus'], comment: '', newNamingBrief: null },
    internalNaming: { selectedId: null, comment: '', newNamingFeedback: null },
    marketingPackage: { selectedId: null, comment: '' },
    deliverables: { legalLanding: false, partnerLanding: false, developmentDeadline: '', comment: '' },
    visualComponents: { selections: {}, delegateToDesigners: false, comment: '' },
  }
}

/** The version the n-th PUT was sent with. */
function sentVersion(n = 0): unknown {
  return (put.mock.calls[n]?.[1] as { expectedUpdatedAt?: string }).expectedUpdatedAt
}

function openDraft(updatedAt = 'v1', status = 'draft') {
  const store = useConstructorStore()
  store.loadBrand(ID, stepData(), 3, status, 'New Brand #7', null, null, null, updatedAt)
  return store
}

beforeEach(() => {
  setActivePinia(createPinia())
  put.mockReset()
  patch.mockReset()
  get.mockReset()
  const data = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  })
})

describe('a save carries the version of the brief the tab saw (H-29)', () => {
  it('the version the brief was opened with goes out with «Далі»', async () => {
    const store = openDraft('2026-10-05T09:00:00.000Z')
    put.mockResolvedValueOnce({ id: ID, status: 'draft', updatedAt: '2026-10-05T09:01:00.000Z' })
    expect(await store.saveBrand()).toBe(true)
    expect(sentVersion(0)).toBe('2026-10-05T09:00:00.000Z')
  })

  it('opened from Brands or the link (route guard / shell): the server version is the base', async () => {
    const store = useConstructorStore()
    applyBrandToStore(store, {
      id: ID,
      status: 'draft',
      internalName: 'New Brand #7',
      currentStep: 3,
      geo: 'UK',
      externalNamingIds: ['exn-joymus'],
      updatedAt: '2026-10-05 09:00:00',
    } as unknown as Brand)
    put.mockResolvedValueOnce({ id: ID, status: 'draft', updatedAt: 'v2' })
    await store.saveBrand()
    expect(sentVersion(0)).toBe('2026-10-05 09:00:00')
  })

  it('each save of the tab moves its version: the next «Далі» is not refused as another tab', async () => {
    const store = openDraft('v1')
    put.mockResolvedValueOnce({ id: ID, status: 'draft', updatedAt: 'v2' })
    put.mockResolvedValueOnce({ id: ID, status: 'draft', updatedAt: 'v3' })
    await store.saveBrand()
    await store.saveBrand()
    expect([sentVersion(0), sentVersion(1)]).toEqual(['v1', 'v2'])
  })

  it('two saves at once go one after another, the second with the version the first got', async () => {
    const store = openDraft('v1')
    let answerFirst!: (v: unknown) => void
    put.mockImplementationOnce(() => new Promise(r => (answerFirst = r)))
    put.mockResolvedValueOnce({ id: ID, status: 'draft', updatedAt: 'v3' })
    const first = store.saveBrand()
    const second = store.saveBrand()
    await Promise.resolve()
    await Promise.resolve()
    expect(put).toHaveBeenCalledTimes(1)
    answerFirst({ id: ID, status: 'draft', updatedAt: 'v2' })
    expect(await first).toBe(true)
    expect(await second).toBe(true)
    expect([sentVersion(0), sentVersion(1)]).toEqual(['v1', 'v2'])
  })

  it('«Вирішено» on a CEO comment moves the version: the save after it carries the new one', async () => {
    const store = useConstructorStore()
    store.loadBrand(ID, stepData(), 8, 'needs_revision', 'New Brand #7', {
      concept: { value: 'Take Wonka', resolved: false, resolvedAt: null },
    }, null, null, 'v1')
    patch.mockResolvedValueOnce({
      id: ID,
      ceoComments: { concept: { value: 'Take Wonka', resolved: true, resolvedAt: 'x' } },
      updatedAt: 'v2',
    })
    expect(await store.setCeoCommentResolved('concept', true)).toBe(true)
    put.mockResolvedValueOnce({ id: ID, status: 'needs_revision', updatedAt: 'v3' })
    await store.saveBrand()
    expect(sentVersion(0)).toBe('v2')
  })

  it('D-60: saved in another tab — the line under the buttons says reload, no «Бриф уже відправлено» window', async () => {
    const store = openDraft('v1')
    put.mockRejectedValueOnce(
      Object.assign(new Error('Бриф змінено — оновіть сторінку.'), { status: 409 })
    )
    // the brief is still a draft: only its answers changed elsewhere
    get.mockResolvedValueOnce({ id: ID, status: 'draft' })
    expect(await store.saveBrand()).toBe(false)
    expect(store.saveError).toBe('Бриф змінено — оновіть сторінку.')
    expect(store.changedElsewhereStatus).toBeNull()
  })

  it('a refused save leaves the version as it was: the tab does not pretend it caught up', async () => {
    const store = openDraft('v1')
    put.mockRejectedValueOnce(Object.assign(new Error('Бриф змінено — оновіть сторінку.'), { status: 409 }))
    get.mockResolvedValueOnce({ id: ID, status: 'draft' })
    await store.saveBrand()
    put.mockRejectedValueOnce(Object.assign(new Error('Бриф змінено — оновіть сторінку.'), { status: 409 }))
    get.mockResolvedValueOnce({ id: ID, status: 'draft' })
    await store.saveBrand()
    expect(sentVersion(1)).toBe('v1')
  })
})
