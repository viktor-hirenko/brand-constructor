import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  resolveUiAssetImageSources,
  resolveUiAssetImageStateClass,
  UI_ASSET_IMAGE_FADE_CLASS,
} from '@/components/ui/uiAssetImage'

/*
 * Owner, 29.09: pictures in the wizard load slowly and «лесенкою», worst when
 * the concept step switches light / dark. Cards downloaded the full upload
 * (1–5 MB PNG, up to 4112 px) for a ~300 px square and the browser painted it
 * row by row. Cards now ask for the small copy and show the picture only
 * whole, fading in over a muted placeholder.
 */

const PNG = '/api/assets/concept_visual/con_1/ast_1.png'

describe('which copy a picture asks for', () => {
  it('a card asks for the small copy and keeps the picture itself as fallback', () => {
    expect(resolveUiAssetImageSources(PNG, 'small')).toEqual({
      src: `${PNG}?size=small`,
      fallback: PNG,
    })
  })

  it('the phone preview and full screen keep the picture itself', () => {
    expect(resolveUiAssetImageSources(PNG, 'large')).toEqual({ src: PNG, fallback: null })
  })

  it('external links (fixtures) are left as they are', () => {
    const ext = 'https://picsum.photos/seed/x/460/460'
    expect(resolveUiAssetImageSources(ext, 'small')).toEqual({ src: ext, fallback: null })
  })
})

describe('no half-painted picture', () => {
  it('is transparent until loaded and decoded, then fades in', () => {
    expect(resolveUiAssetImageStateClass(false)).toBe('opacity-0')
    expect(resolveUiAssetImageStateClass(true)).toBe('opacity-100')
    expect(UI_ASSET_IMAGE_FADE_CLASS).toContain('transition-opacity')
    expect(UI_ASSET_IMAGE_FADE_CLASS).toContain('motion-reduce:transition-none')
  })
})

/*
 * The guard that goes red if a card goes back to loading the original: every
 * card picture must be `UiAssetImage` with the small size, and no raw `<img>`
 * may be left in those files.
 */
describe('cards load the small copy', () => {
  const read = (p: string) =>
    readFileSync(resolve(__dirname, '../../../../src/components', p), 'utf8')

  const CARDS: ReadonlyArray<readonly [file: string, count: number]> = [
    ['constructor/alternative-selection/ConceptCard.vue', 1],
    ['constructor/review/ReviewConceptBlock.vue', 4],
  ]

  for (const [file, count] of CARDS) {
    it(`${file}: ${count} picture(s), all small, no raw <img>`, () => {
      const src = read(file)
      const template = src.slice(src.indexOf('<template>'))
      expect(template).not.toMatch(/<img\b/)
      const pictures = template.match(/<UiAssetImage\b[^>]*>/g) ?? []
      expect(pictures).toHaveLength(count)
      for (const tag of pictures) expect(tag).not.toContain('size="large"')
    })
  }

  it('the component itself falls back to the picture when the small copy fails', () => {
    const vue = read('ui/UiAssetImage.vue')
    expect(vue).toContain('@error="handleError"')
    expect(vue).toContain('currentSrc.value = fallback')
  })

  it('the phone preview keeps the large picture but fades it in too', () => {
    const src = read('constructor/preview/ConceptMobilePreview.vue')
    const template = src.slice(src.indexOf('<template>'))
    expect(template).not.toMatch(/<img\b/)
    const pictures = template.match(/<UiAssetImage\b[\s\S]*?\/>/g) ?? []
    expect(pictures).toHaveLength(2)
    for (const tag of pictures) expect(tag).toContain('size="large"')
  })
})
