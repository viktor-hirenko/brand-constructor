import { describe, it, expect, beforeEach } from 'vitest'
import {
  acquireBodyScrollLock,
  releaseBodyScrollLock,
  resetBodyScrollLockForTests,
  type ScrollLockTarget,
} from '@/composables/useBodyScrollLock'

/**
 * Background scroll lock — DP-15258 phase 6.
 *
 * Not a component test (this package runs on `environment: 'node'`, no `jsdom`):
 * the composable hands its target in, so the counter can be exercised against a
 * plain object. What matters is the nesting — a confirmation opening on top of
 * an order modal must not hand scrolling back when only it closes.
 */

function makeTarget(overflow = ''): ScrollLockTarget {
  return { style: { overflow } }
}

beforeEach(() => {
  resetBodyScrollLockForTests()
})

describe('body scroll lock', () => {
  it('freezes the page while a modal is open', () => {
    const body = makeTarget()

    acquireBodyScrollLock(body)
    expect(body.style.overflow).toBe('hidden')

    releaseBodyScrollLock(body)
    expect(body.style.overflow).toBe('')
  })

  it('keeps the page frozen until the last of two stacked modals closes', () => {
    const body = makeTarget()

    acquireBodyScrollLock(body)
    acquireBodyScrollLock(body)

    releaseBodyScrollLock(body)
    expect(body.style.overflow).toBe('hidden')

    releaseBodyScrollLock(body)
    expect(body.style.overflow).toBe('')
  })

  it('restores whatever the page had before, not a blank value', () => {
    const body = makeTarget('scroll')

    acquireBodyScrollLock(body)
    expect(body.style.overflow).toBe('hidden')

    releaseBodyScrollLock(body)
    expect(body.style.overflow).toBe('scroll')
  })

  it('ignores a release with no lock held', () => {
    const body = makeTarget('auto')

    releaseBodyScrollLock(body)
    expect(body.style.overflow).toBe('auto')

    // And the stray release must not have pushed the counter negative, or the
    // next real lock would never take effect.
    acquireBodyScrollLock(body)
    expect(body.style.overflow).toBe('hidden')
    releaseBodyScrollLock(body)
    expect(body.style.overflow).toBe('auto')
  })
})
