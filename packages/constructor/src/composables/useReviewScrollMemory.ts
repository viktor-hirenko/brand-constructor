const SCROLL_KEY_PREFIX = 'review-scroll:'
const PENDING_KEY_PREFIX = 'review-scroll-pending:'

function scrollKey(brandId: string): string {
  return `${SCROLL_KEY_PREFIX}${brandId}`
}

function pendingKey(brandId: string): string {
  return `${PENDING_KEY_PREFIX}${brandId}`
}

/** Persist review scroll position before navigating to ceo-reselect. */
export function saveReviewScrollPosition(brandId: string, scrollTop: number): void {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.setItem(scrollKey(brandId), String(Math.max(0, scrollTop)))
  sessionStorage.setItem(pendingKey(brandId), '1')
}

/**
 * Read and clear a pending scroll restore for this brand.
 * Returns null when there is nothing to restore (fresh entry, F5, etc.).
 */
export function consumeReviewScrollPosition(brandId: string): number | null {
  if (typeof sessionStorage === 'undefined') return null
  const isPending = sessionStorage.getItem(pendingKey(brandId)) === '1'
  if (!isPending) return null

  const raw = sessionStorage.getItem(scrollKey(brandId))
  sessionStorage.removeItem(scrollKey(brandId))
  sessionStorage.removeItem(pendingKey(brandId))

  if (raw == null) return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}
