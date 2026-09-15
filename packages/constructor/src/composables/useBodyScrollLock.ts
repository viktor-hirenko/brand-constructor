import { onMounted, onBeforeUnmount } from 'vue'

/**
 * Freezes the page behind an open modal.
 *
 * DP-15258 phase 6. None of the four modal shells locked anything, so a wheel
 * over the backdrop scrolled whatever sat underneath — the acceptance of the
 * phase asks for that to stop.
 *
 * Reference-counted on purpose: a confirmation can open on top of a form modal
 * ("delete the brief" over the order modal), and the inner one closing must not
 * hand scrolling back while the outer one is still up. The previous inline
 * value is remembered by the *first* lock and restored by the last release, so
 * a page that was already frozen stays frozen afterwards.
 *
 * The counter lives in module scope, which is what makes it shared; the pure
 * pair below takes its target as an argument so it can be tested in the `node`
 * environment this package runs on (no `jsdom`, `vitest.config.ts:11`).
 */

/** Anything with a writable `style.overflow` — `document.body` in production. */
export interface ScrollLockTarget {
  style: { overflow: string }
}

let lockCount = 0
let restoreOverflow = ''

export function acquireBodyScrollLock(target: ScrollLockTarget): void {
  if (lockCount === 0) {
    restoreOverflow = target.style.overflow
    target.style.overflow = 'hidden'
  }
  lockCount += 1
}

export function releaseBodyScrollLock(target: ScrollLockTarget): void {
  if (lockCount === 0) return

  lockCount -= 1
  if (lockCount === 0) {
    target.style.overflow = restoreOverflow
    restoreOverflow = ''
  }
}

/** Test seam: the counter is module state and would leak between test cases. */
export function resetBodyScrollLockForTests(): void {
  lockCount = 0
  restoreOverflow = ''
}

export function useBodyScrollLock(): void {
  onMounted(() => {
    if (typeof document === 'undefined') return
    acquireBodyScrollLock(document.body)
  })

  onBeforeUnmount(() => {
    if (typeof document === 'undefined') return
    releaseBodyScrollLock(document.body)
  })
}
