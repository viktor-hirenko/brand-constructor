import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  CONCEPT_LOCKED_ERROR,
  conceptIdForAsset,
  isConceptLocked,
} from '@/utils/asset-upload-auth'

/*
 * A concept used by an approved brand is frozen — text, theme AND images.
 * Owner, 29.09: once it is used, nothing on it is to be changed.
 *
 * `PUT /concepts/:id` refused since the first version; `/assets` upload and
 * delete did not ask at all, so a used concept's pictures could be replaced
 * or removed. The route handlers cannot run here (no D1 in node), so the
 * wiring is pinned by reading the source: each handler must ask
 * `isConceptLocked` BEFORE it touches the bucket.
 */

describe('conceptIdForAsset', () => {
  it('names the concept for its visual and every gallery slot', () => {
    expect(conceptIdForAsset('concept_visual', 'con_1')).toBe('con_1')
    expect(conceptIdForAsset('concept_gallery_1', 'con_1')).toBe('con_1')
    expect(conceptIdForAsset('concept_gallery_10', 'con_1')).toBe('con_1')
  })

  it('is null for anything that is not a concept', () => {
    expect(conceptIdForAsset('component_thumbnail', 'cv_1')).toBeNull()
    expect(conceptIdForAsset('concept_gallery_x', 'con_1')).toBeNull()
  })
})

describe('isConceptLocked', () => {
  it('locks a used concept, by status or by brand link', () => {
    expect(isConceptLocked({ status: 'used', used_in_brand_id: 'brd_1' })).toBe(true)
    expect(isConceptLocked({ status: 'used', used_in_brand_id: null })).toBe(true)
    expect(isConceptLocked({ status: 'active', used_in_brand_id: 'brd_1' })).toBe(true)
  })

  it('leaves a free concept and a missing one open', () => {
    expect(isConceptLocked({ status: 'active', used_in_brand_id: null })).toBe(false)
    expect(isConceptLocked(null)).toBe(false)
  })
})

describe('the routes ask before they write', () => {
  const read = (file: string): string =>
    readFileSync(resolve(__dirname, '../../../src/routes', file), 'utf8')

  /** The body of one route handler, from its declaration to the next one. */
  const handler = (source: string, start: string): string => {
    const from = source.indexOf(start)
    expect(from, `handler ${start} not found`).toBeGreaterThanOrEqual(0)
    const next = source.indexOf('\napp.', from + start.length)
    return source.slice(from, next === -1 ? undefined : next)
  }

  it('upload refuses a locked concept before putting the file in R2', () => {
    const body = handler(read('assets.ts'), "app.post('/upload'")
    const ask = body.indexOf('isConceptLocked(')
    expect(ask).toBeGreaterThan(-1)
    expect(ask).toBeLessThan(body.indexOf('ASSETS_BUCKET.put'))
    expect(body).toContain('CONCEPT_LOCKED_ERROR')
  })

  it('delete refuses a locked concept before removing the file from R2', () => {
    const body = handler(read('assets.ts'), "app.delete('/:id'")
    const ask = body.indexOf('isConceptLocked(')
    expect(ask).toBeGreaterThan(-1)
    expect(ask).toBeLessThan(body.indexOf('ASSETS_BUCKET.delete'))
    expect(body).toContain('CONCEPT_LOCKED_ERROR')
  })

  it('concept PUT uses the same test and the same words', () => {
    const body = handler(read('concepts.ts'), "app.put('/:id'")
    expect(body).toContain('isConceptLocked(existing)')
    expect(body).toContain('CONCEPT_LOCKED_ERROR')
  })

  it('keeps the words the Admin recognises', () => {
    // `packages/admin/src/utils/apiErrorText.ts` matches on this text.
    expect(CONCEPT_LOCKED_ERROR).toBe('Cannot modify a concept that is used in a brand')
  })
})
