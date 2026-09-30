import { smallAssetUrl } from '@brand-constructor/shared'

/**
 * Sources and classes for `UiAssetImage.vue`.
 *
 * Owner, 29.09: pictures in the wizard came in slowly and «лесенкою» (top to
 * bottom), worst when the concept step switches light / dark. A ~300 px card
 * downloaded the 2000–4000 px PNG uploaded in the admin, and the browser
 * painted it row by row as the bytes arrived.
 *
 *  - `small` asks the worker for the small copy (`?size=small`, 800 px WebP —
 *    packages/shared/src/utils/assetVariants.ts). Pictures uploaded before it
 *    existed have none; the worker then answers with the picture itself, and
 *    if even that request fails the image retries the plain URL.
 *  - `large` is the picture itself — full-screen viewer, phone preview.
 *
 * Either way the picture stays transparent until it has loaded AND decoded,
 * then fades in whole. Until then the parent's muted background is the
 * placeholder, so no half-painted picture is ever on screen.
 */

export type UiAssetImageSize = 'small' | 'large'

/** `url` is already resolved by `getAssetUrl`. */
export function resolveUiAssetImageSources(
  url: string,
  size: UiAssetImageSize
): { src: string; fallback: string | null } {
  if (size === 'large') return { src: url, fallback: null }
  const src = smallAssetUrl(url)
  return { src, fallback: src === url ? null : url }
}

export const UI_ASSET_IMAGE_FADE_CLASS =
  'transition-opacity duration-300 ease-out motion-reduce:transition-none'

export function resolveUiAssetImageStateClass(loaded: boolean): string {
  return loaded ? 'opacity-100' : 'opacity-0'
}
