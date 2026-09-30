import {
  ASSET_LARGE_QUALITY,
  ASSET_SMALL_FORM_FIELD,
  ASSET_SMALL_QUALITY,
  largeAssetSize,
  smallAssetSize,
} from '@brand-constructor/shared'

/*
 * Owner, 29.09: wizard pictures load slowly and «лесенкою» — the admin stored
 * whatever was uploaded (PNG, 1–5 MB, up to 4112 px) and a ~300 px card
 * downloaded all of it. The browser now re-encodes the picture as WebP before
 * sending, in two sizes (packages/shared/src/utils/assetVariants.ts):
 *
 *  - `file`       — large copy, ≤ 2560 px; the worker validates it exactly as
 *                   it validated the original (type, size, minimum, ratio);
 *  - `file_small` — small copy, short side 800 px, for cards.
 *
 * Whatever cannot be converted goes as before, untouched: SVG and other
 * types, a picture the browser cannot decode, and every picture in a browser
 * that cannot write WebP (Safari's canvas silently writes PNG instead).
 */

const CONVERTIBLE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

export interface DecodedImage {
  width: number
  height: number
  source: CanvasImageSource
  close?: () => void
}

/** The two browser calls, injectable so the rules can be tested in node. */
export interface ImageCodec {
  decode(file: Blob): Promise<DecodedImage>
  encode(image: DecodedImage, width: number, height: number, quality: number): Promise<Blob>
}

export const browserImageCodec: ImageCodec = {
  async decode(file) {
    const bitmap = await createImageBitmap(file)
    return {
      width: bitmap.width,
      height: bitmap.height,
      source: bitmap,
      close: () => bitmap.close(),
    }
  },
  encode(image, width, height, quality) {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return Promise.reject(new Error('Canvas 2D is not available'))
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(image.source, 0, 0, width, height)
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        blob => (blob ? resolve(blob) : reject(new Error('Could not encode image'))),
        'image/webp',
        quality
      )
    })
  },
}

export interface UploadVariants {
  large: File
  small: File | null
}

function webpName(name: string, suffix = ''): string {
  const dot = name.lastIndexOf('.')
  const stem = dot > 0 ? name.slice(0, dot) : name
  return `${stem}${suffix}.webp`
}

export async function makeUploadVariants(
  file: File,
  codec: ImageCodec = browserImageCodec
): Promise<UploadVariants> {
  const untouched: UploadVariants = { large: file, small: null }
  if (!CONVERTIBLE_TYPES.has(file.type)) return untouched

  let image: DecodedImage
  try {
    image = await codec.decode(file)
  } catch {
    return untouched
  }

  try {
    const { width, height } = image
    const largeSize = largeAssetSize(width, height)
    const largeBlob = await codec.encode(image, largeSize.width, largeSize.height, ASSET_LARGE_QUALITY)
    // No WebP writer in this browser: send the original as before.
    if (largeBlob.type !== 'image/webp') return untouched

    const resized = largeSize.width !== width || largeSize.height !== height
    // Same size and WebP came out heavier (an already tight file): keep the original.
    const large =
      !resized && largeBlob.size >= file.size
        ? file
        : new File([largeBlob], webpName(file.name), { type: 'image/webp' })

    let small: File | null = null
    const smallSize = smallAssetSize(width, height)
    if (smallSize) {
      const smallBlob = await codec.encode(image, smallSize.width, smallSize.height, ASSET_SMALL_QUALITY)
      if (smallBlob.type === 'image/webp') {
        small = new File([smallBlob], webpName(file.name, '.small'), { type: 'image/webp' })
      }
    }
    return { large, small }
  } catch {
    return untouched
  } finally {
    image.close?.()
  }
}

/**
 * Swaps the form's `file` for its large WebP copy and adds the small one.
 * Forms without a picture in `file` are left as they are.
 */
export async function prepareImageUpload(
  formData: FormData,
  codec: ImageCodec = browserImageCodec
): Promise<void> {
  const file = formData.get('file')
  if (!(file instanceof File)) return
  const { large, small } = await makeUploadVariants(file, codec)
  if (large !== file) formData.set('file', large, large.name)
  if (small) formData.set(ASSET_SMALL_FORM_FIELD, small, small.name)
}
