import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Brief-orders plan, phase 2b, on the screens. Tests read the SOURCE: the
 * views reach for the router and the API on setup and `vitest` runs in `node`
 * (see `draftConceptEditScreen.test.ts`). The rules themselves are held by
 * `tests/unit/utils/madeForBrief.test.ts`.
 */

const SRC = resolve(__dirname, '../../../src')
const read = (rel: string) => readFileSync(resolve(SRC, rel), 'utf8')

const pickers = {
  concept: read('views/draft-edit/DraftConceptEditView.vue'),
  externalAfterConcept: read('views/draft-edit/DraftExternalNamingEditView.vue'),
  external: read('views/wizard/ExternalNamingView.vue'),
  internal: read('views/wizard/InternalNamingView.vue'),
}

/** The body of `function <name>(…) { … }` up to the next top-level function. */
function fnBody(source: string, name: string): string {
  const start = source.indexOf(`function ${name}(`)
  expect(start, `${name} exists`).toBeGreaterThan(-1)
  const next = source.indexOf('\nfunction ', start + 1)
  return source.slice(start, next === -1 ? undefined : next)
}

describe('made for the brief — first, under its own label', () => {
  for (const [screen, source] of Object.entries(pickers)) {
    it(`${screen}: the list goes through MadeForBriefGroups`, () => {
      expect(source).toContain('<MadeForBriefGroups')
      expect(source).toContain('splitMadeForBrief(')
    })
  }
})

describe('made for the brief — picked without «Обрати цей …?»', () => {
  it('concept: the made one drops the concept order before any confirmation', () => {
    const body = fnBody(pickers.concept, 'handleSelect')
    const made = body.indexOf('isMadeForBrief(')
    const confirm = body.indexOf('showSwitchConfirm.value = true')
    expect(made).toBeGreaterThan(-1)
    expect(made).toBeLessThan(confirm)
  })

  it('names: a made name drops the name order before any confirmation', () => {
    for (const [source, fn] of [
      [pickers.externalAfterConcept, 'handleToggle'],
      [pickers.external, 'handleToggle'],
      [pickers.internal, 'handleSelect'],
    ] as const) {
      const body = fnBody(source, fn)
      const made = body.search(/isMadeName\(|namingGroups\.value\.made/)
      const confirm = body.indexOf('showSwitchConfirm.value = true')
      expect(made).toBeGreaterThan(-1)
      expect(made).toBeLessThan(confirm)
    }
  })
})

describe('H-07 — step 2 asks, then drops the name order', () => {
  const step2 = read('views/wizard/ConceptSelectionView.vue')

  it('another concept goes through «Змінити концепт?»', () => {
    const body = fnBody(step2, 'handleSelect')
    expect(body).toContain('dropsNamingOrder(conceptId)')
    expect(body).toContain('showNamingOrderConfirm.value = true')
    expect(fnBody(step2, 'confirmNamingOrderDrop')).toContain('store.setNewNamingBrief(null)')
  })

  it('ordering a new concept drops it as well', () => {
    expect(fnBody(step2, 'handleBriefSave')).toContain('store.setNewNamingBrief(null)')
  })
})
