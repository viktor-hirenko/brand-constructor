import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  consumeReviewScrollPosition,
  saveReviewScrollPosition,
} from '@/composables/useReviewScrollMemory'

function createSessionStorageMock(): Storage {
  const store = new Map<string, string>()
  return {
    get length() {
      return store.size
    },
    clear() {
      store.clear()
    },
    getItem(key: string) {
      return store.get(key) ?? null
    },
    key(index: number) {
      return [...store.keys()][index] ?? null
    },
    removeItem(key: string) {
      store.delete(key)
    },
    setItem(key: string, value: string) {
      store.set(key, value)
    },
  }
}

describe('useReviewScrollMemory', () => {
  const brandId = 'brand-test-1'

  beforeEach(() => {
    globalThis.sessionStorage = createSessionStorageMock()
  })

  afterEach(() => {
    sessionStorage.clear()
  })

  it('saveReviewScrollPosition stores scroll and pending flag', () => {
    saveReviewScrollPosition(brandId, 420)
    expect(sessionStorage.getItem(`review-scroll:${brandId}`)).toBe('420')
    expect(sessionStorage.getItem(`review-scroll-pending:${brandId}`)).toBe('1')
  })

  it('consumeReviewScrollPosition returns value once and clears keys', () => {
    saveReviewScrollPosition(brandId, 256)
    expect(consumeReviewScrollPosition(brandId)).toBe(256)
    expect(consumeReviewScrollPosition(brandId)).toBeNull()
    expect(sessionStorage.getItem(`review-scroll:${brandId}`)).toBeNull()
    expect(sessionStorage.getItem(`review-scroll-pending:${brandId}`)).toBeNull()
  })

  it('consumeReviewScrollPosition returns null when pending flag is absent', () => {
    sessionStorage.setItem(`review-scroll:${brandId}`, '100')
    expect(consumeReviewScrollPosition(brandId)).toBeNull()
  })

  it('saveReviewScrollPosition clamps negative scroll to zero', () => {
    saveReviewScrollPosition(brandId, -50)
    expect(sessionStorage.getItem(`review-scroll:${brandId}`)).toBe('0')
  })
})
