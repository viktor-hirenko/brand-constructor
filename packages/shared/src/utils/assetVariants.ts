/**
 * Two sizes of one uploaded picture — owner, 29.09: wizard images came in
 * slowly and «лесенкою», because a ~300 px concept card downloaded the
 * 2000–4000 px PNG the admin had uploaded as is.
 *
 * Admin now encodes WebP in the browser before sending:
 *  - the LARGE copy is the asset itself (row in `assets`, `file_url`), used by
 *    the full-screen viewer and the phone preview;
 *  - the SMALL copy lives in R2 next to it under a predictable name, with no
 *    row of its own, so the schema stays as it was.
 *
 * Cards ask for `<file_url>?size=small`. The worker answers with the small
 * copy when it exists and with the large one when it does not (every picture
 * uploaded before this change), so old pictures keep showing.
 */

/** Longest side of the large copy. Bigger originals are scaled down to it. */
export const ASSET_LARGE_MAX_SIDE = 2560

/**
 * Shortest side of the small copy. Cards are square and `object-cover`, so it
 * is the short side that has to fill ~300 CSS px on a 2× screen.
 */
export const ASSET_SMALL_SHORT_SIDE = 800

/** WebP quality of each copy, as `canvas.toBlob` takes it (0..1). */
export const ASSET_LARGE_QUALITY = 0.85
export const ASSET_SMALL_QUALITY = 0.8

/** Upper bound the worker accepts for the small copy. */
export const ASSET_SMALL_MAX_BYTES = 3 * 1024 * 1024

/** Form field the admin sends the small copy in. */
export const ASSET_SMALL_FORM_FIELD = 'file_small'

/** Query that asks the worker for the small copy. */
export const ASSET_SMALL_QUERY_KEY = 'size'
export const ASSET_SMALL_QUERY_VALUE = 'small'

const SMALL_SUFFIX = '.small.webp'

/**
 * R2 key (or file name) of the small copy: `…/ast_1.png` → `…/ast_1.small.webp`.
 * The extension of the large copy does not matter — the asset id is the name.
 */
export function smallAssetKey(key: string): string {
  const slash = key.lastIndexOf('/')
  const dot = key.lastIndexOf('.')
  const stem = dot > slash ? key.slice(0, dot) : key
  return `${stem}${SMALL_SUFFIX}`
}

/**
 * URL a card asks for. Only our own `/api/assets/…` pictures have a small copy;
 * anything else (external links, fixtures) is returned untouched.
 */
export function smallAssetUrl(url: string): string {
  if (!url.includes('/api/assets/')) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}${ASSET_SMALL_QUERY_KEY}=${ASSET_SMALL_QUERY_VALUE}`
}

/** Scaled size that keeps the ratio; `scale` is clamped so it never enlarges. */
function scaled(width: number, height: number, scale: number): { width: number; height: number } {
  const s = Math.min(1, scale)
  return {
    width: Math.max(1, Math.round(width * s)),
    height: Math.max(1, Math.round(height * s)),
  }
}

/** Size of the large copy for an original of `width × height`. */
export function largeAssetSize(width: number, height: number): { width: number; height: number } {
  return scaled(width, height, ASSET_LARGE_MAX_SIDE / Math.max(width, height))
}

/**
 * Size of the small copy, or `null` when it would be no smaller than the large
 * one — then there is nothing to gain and the worker falls back to the large.
 */
export function smallAssetSize(
  width: number,
  height: number
): { width: number; height: number } | null {
  const large = largeAssetSize(width, height)
  const small = scaled(width, height, ASSET_SMALL_SHORT_SIDE / Math.min(width, height))
  if (small.width >= large.width && small.height >= large.height) return null
  return small
}
