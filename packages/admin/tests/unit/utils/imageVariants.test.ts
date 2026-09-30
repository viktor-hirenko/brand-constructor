import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  makeUploadVariants,
  prepareImageUpload,
  type ImageCodec,
} from '@/utils/imageVariants'

/*
 * Owner, 29.09: pictures were stored as uploaded (PNG, 1–5 MB, up to 4112 px)
 * and a ~300 px wizard card downloaded all of it. The admin now sends WebP in
 * two sizes. The canvas cannot run in node, so the codec is faked: it records
 * what it was asked to encode and answers with a blob of the chosen type.
 */

function fakeCodec(
  width: number,
  height: number,
  opts: { outType?: string; bytesPerPixel?: number } = {}
): ImageCodec & { calls: Array<[number, number, number]> } {
  const calls: Array<[number, number, number]> = []
  return {
    calls,
    async decode() {
      return { width, height, source: {} as CanvasImageSource }
    },
    async encode(_img, w, h, q) {
      calls.push([w, h, q])
      const size = Math.round(w * h * (opts.bytesPerPixel ?? 0.1))
      return new Blob([new Uint8Array(size)], { type: opts.outType ?? 'image/webp' })
    },
  }
}

function pngFile(bytes: number, name = 'Concept Visual.png'): File {
  return new File([new Uint8Array(bytes)], name, { type: 'image/png' })
}

describe('makeUploadVariants', () => {
  it('turns a 4112×2658 PNG into a 2560 WebP and an 800 WebP', async () => {
    const codec = fakeCodec(4112, 2658)
    const { large, small } = await makeUploadVariants(pngFile(4_190_969), codec)
    expect(codec.calls.map(([w, h]) => [w, h])).toEqual([
      [2560, 1655],
      [1238, 800],
    ])
    expect(large.type).toBe('image/webp')
    expect(large.name).toBe('Concept Visual.webp')
    expect(small?.type).toBe('image/webp')
    expect(small?.name).toBe('Concept Visual.small.webp')
  })

  it('keeps a small picture whole and makes no small copy of it', async () => {
    const codec = fakeCodec(360, 1033)
    const { large, small } = await makeUploadVariants(pngFile(900_000), codec)
    expect(codec.calls).toEqual([[360, 1033, 0.85]])
    expect(large.type).toBe('image/webp')
    expect(small).toBeNull()
  })

  it('keeps the original when WebP of the same size comes out heavier', async () => {
    const file = pngFile(1000)
    const { large, small } = await makeUploadVariants(file, fakeCodec(2000, 2000))
    expect(large).toBe(file)
    expect(small?.type).toBe('image/webp')
  })

  it('sends the original untouched when the browser cannot write WebP (Safari)', async () => {
    const file = pngFile(4_000_000)
    const { large, small } = await makeUploadVariants(
      file,
      fakeCodec(4112, 2658, { outType: 'image/png' })
    )
    expect(large).toBe(file)
    expect(small).toBeNull()
  })

  it('leaves SVG and other types alone', async () => {
    const svg = new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' })
    const codec = fakeCodec(100, 100)
    const { large, small } = await makeUploadVariants(svg, codec)
    expect(large).toBe(svg)
    expect(small).toBeNull()
    expect(codec.calls).toEqual([])
  })

  it('sends the original when the picture cannot be decoded', async () => {
    const file = pngFile(10)
    const codec: ImageCodec = {
      decode: () => Promise.reject(new Error('broken')),
      encode: () => Promise.reject(new Error('unreachable')),
    }
    expect(await makeUploadVariants(file, codec)).toEqual({ large: file, small: null })
  })
})

describe('prepareImageUpload', () => {
  it('replaces `file` with the large copy and adds `file_small`, other fields untouched', async () => {
    const fd = new FormData()
    fd.append('file', pngFile(4_190_969))
    fd.append('entity_type', 'concept_visual')
    fd.append('aspect_ratio', '1.547')
    await prepareImageUpload(fd, fakeCodec(4112, 2658))
    expect((fd.get('file') as File).type).toBe('image/webp')
    expect((fd.get('file_small') as File).type).toBe('image/webp')
    expect(fd.get('entity_type')).toBe('concept_visual')
    expect(fd.get('aspect_ratio')).toBe('1.547')
  })

  it('every admin upload goes through it', () => {
    const src = readFileSync(resolve(__dirname, '../../../src/composables/useApi.ts'), 'utf8')
    const body = src.slice(src.indexOf('export async function apiUpload'))
    expect(body.slice(0, body.indexOf('\n}\n'))).toContain('await prepareImageUpload(formData)')
  })
})
