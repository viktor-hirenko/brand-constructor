import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Brief-orders plan, phase 4, on the revision screens: the author of a brief
 * back from the CEO can order a new concept, name or Internal Naming, with the
 * same button and forms as the draft. Tests read the SOURCE — the views reach
 * for the router and the API on setup and `vitest` runs in `node` (see
 * `madeForBriefScreens.test.ts`); the rules are in `utils/inWorkReview.ts`.
 */

const SRC = resolve(__dirname, '../../../src')
const read = (rel: string) => readFileSync(resolve(SRC, rel), 'utf8')

const screens = {
  concept: {
    source: read('views/revision-response/RevisionConceptView.vue'),
    create: 'Замовити новий концепт',
    modal: '<NewConceptModal',
    kind: "'concept'",
  },
  external: {
    source: read('views/revision-response/RevisionExternalNamingView.vue'),
    create: 'Замовити нову назву',
    modal: '<NewNamingModal',
    kind: "'externalNaming'",
  },
  internal: {
    source: read('views/revision-response/RevisionInternalNamingView.vue'),
    create: 'Замовити нову назву',
    modal: '<NewInternalNamingModal',
    kind: "'internalNaming'",
  },
}

/** The body of `function <name>(…) { … }` up to the next top-level function. */
function fnBody(source: string, name: string): string {
  const start = source.search(new RegExp(`(async )?function ${name}\\(`))
  expect(start, `${name} exists`).toBeGreaterThan(-1)
  const next = source.slice(start + 1).search(/\n(async )?function /)
  return source.slice(start, next === -1 ? undefined : start + 1 + next)
}

describe('revision screens — the order button and its form', () => {
  for (const [name, s] of Object.entries(screens)) {
    it(`${name}: «${s.create}», the form, delete and switch confirmations`, () => {
      expect(s.source).toContain('<BriefOrderButton')
      expect(s.source).toContain(`create-label="${s.create}"`)
      expect(s.source).toContain(s.modal)
      expect(s.source).toContain('title="Видалити бриф?"')
      expect(s.source).toMatch(/title="Обрати (цей концепт|цей неймінг|цю назву)\?"/)
      // the answers stay editable from the preview: a returned brief is not in work
      expect(s.source).toContain(`openBriefPreview(${s.kind}, { allowEdit: true })`)
      expect(s.source).not.toContain(':locked=')
    })
  }
})

describe('revision screens — an order is enough to go on', () => {
  it('concept: «Далі» is open with an order and saves it instead of wiping it', () => {
    const { source } = screens.concept
    expect(source).toMatch(/primaryDisabled = computed\(\(\) => !selectedId\.value && !hasBrief\.value\)/)
    const dali = fnBody(source, 'goDali')
    // the order branch comes before the «nothing picked» return
    expect(dali.indexOf('saveConceptOrder()')).toBeGreaterThan(-1)
    expect(dali.indexOf('saveConceptOrder()')).toBeLessThan(dali.indexOf('if (!selectedId.value) return'))
    const save = fnBody(source, 'saveConceptOrder')
    expect(save).not.toContain('newConceptBrief: null')
    // the old concept's names go with it (names come with the new concept)
    expect(save).toContain('setExternalNaming({ selectedIds: [], newNamingBrief: null })')
  })

  it('external: the step counts an order as valid', () => {
    const { source } = screens.external
    expect(source).toMatch(/isExternalNamingStepValid\([\s\S]*?isCreatingNew\.value,[\s\S]*?\)/)
  })

  it('internal: «Зберегти» is open with an order', () => {
    expect(screens.internal.source).toMatch(
      /primaryDisabled = computed\(\s*\(\) => !store\.stepData\.internalNaming\.selectedId && !isCreatingNew\.value\s*\)/
    )
  })

  it('picking from the library while something is on order asks first', () => {
    for (const [source, fn] of [
      [screens.concept.source, 'selectConcept'],
      [screens.external.source, 'handleToggle'],
      [screens.internal.source, 'handleSelect'],
    ] as const) {
      const body = fnBody(source, fn)
      expect(body, fn).toContain('showSwitchConfirm.value = true')
    }
  })
})
