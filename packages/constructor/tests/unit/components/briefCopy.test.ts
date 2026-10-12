import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * ── Wording taken from DP-15450, work 02 ────────────────────────────────────
 *
 * Three of the designer's remarks are pure copy, and copy is the one kind of
 * fix that silently rots: a later session renames a heading back because the
 * new wording reads odd out of context. Her own sentences are quoted in each
 * block below so that the next reader can check the string against her words
 * instead of against taste.
 *
 * The tests read the SOURCE, not a mounted tree — `vitest.config.ts` runs in
 * `node`, and every one of these strings is a literal in a template or a map.
 */

const SRC = resolve(__dirname, '../../../src')
const read = (rel: string) => readFileSync(resolve(SRC, rel), 'utf8')

const newNamingModal = read('components/constructor/modals/NewNamingModal.vue')
const newInternalModal = read('components/constructor/modals/NewInternalNamingModal.vue')
const externalList = read('components/constructor/review/ReviewExternalNamingsList.vue')
const internalBlock = read('components/constructor/review/ReviewInternalNamingBlock.vue')
const print = read('composables/usePrintBrand.ts')
const reviewView = read('views/wizard/BriefReviewView.vue')

/**
 * Final review 1 · LOW — «Назви брифів сформульовані неузгоджено: "Бріф нового
 * External Naming" / "Бріф нової Internal Naming". → Замінити на: "Бриф на
 * створення External Naming" та "Бриф на створення Internal Naming".»
 *
 * Six places carry it: the read-only header of each brief modal, and the
 * review row for each naming — the external one twice (the PO column and the
 * single-column layout), the internal one twice for the same reason.
 */
describe('the naming briefs are named the way the board asks', () => {
  it('the read-only modal headers', () => {
    expect(newNamingModal).toContain("'Бриф на створення External Naming'")
    expect(newInternalModal).toContain("'Бриф на створення Internal Naming'")
  })

  it('both rows of the external list in the final review', () => {
    const hits = externalList.match(/Бриф на створення External Naming/g) ?? []
    expect(hits).toHaveLength(2)
  })

  it('both rows of the internal block in the final review', () => {
    const hits = internalBlock.match(/Бриф на створення Internal Naming/g) ?? []
    expect(hits).toHaveLength(2)
  })

  it('no place still says the old wording', () => {
    for (const file of [newNamingModal, newInternalModal, externalList, internalBlock]) {
      expect(file).not.toMatch(/Бриф нового External Naming/)
      expect(file).not.toMatch(/Бриф нової Internal Naming/)
    }
  })
})

/**
 * visual components 1 · MEDIUM — «Перейменувати крок (та змінити відповідно по
 * всьому білдеру visual components на Interface Components).»
 *
 * The screen was renamed in `router/index.ts` long ago. The PRINTED brief was
 * the last holdout: the section heading said «Visual Components» and the CEO
 * comment label said «Візуальні компоненти».
 */
describe('the printed brief calls step 7 what the rest of the builder calls it', () => {
  it('the section heading', () => {
    expect(print).toContain("buildSectionContent('Interface Components', vcRows)")
    expect(print).not.toContain("buildSectionContent('Visual Components'")
  })

  it('the CEO comment label for that section', () => {
    expect(print).toMatch(/visualComponents: 'Interface Components'/)
    expect(print).not.toMatch(/visualComponents: 'Візуальні компоненти'/)
  })
})

/**
 * The same remark, checked live on 12.10: the step and the printed brief said
 * «Interface Components», while the section on Final review, on the CEO's
 * screen and in the approved brief — one component draws all three — still said
 * «Visual Components». Her own drawing of that screen (`5382:37135`) carries the
 * old heading too; the owner settled it on 12.10: «Исправь».
 */
describe('the review calls that section what step 7 is called', () => {
  const review = read('components/constructor/review/ReviewUnifiedView.vue')

  it('the section heading on Final review, the CEO screen and the approved brief', () => {
    expect(review).toContain('title="Interface Components"')
    expect(review).not.toContain('title="Visual Components"')
  })
})

/**
 * CEO view 5 · LOW — «Змінити заголовок на "Затвердити бриф зі змінами?".
 * Primary: "Затвердити зі змінами", secondary: "Повернути на доопрацювання".»
 *
 * All four strings are on her drawn modal `5387:78012`, and the body there is
 * ONE paragraph — the hard break this copy used to carry was ours, not hers.
 *
 * This is the WARNING variant only: the plain «Затвердити бриф?» confirmation,
 * shown when the CEO changed nothing, is a different modal and she did not ask
 * for it to change.
 */
describe('the CEO approve-with-changes confirmation is her text', () => {
  const warning = reviewView.slice(
    reviewView.indexOf('const approveConfirmCopy'),
    reviewView.indexOf('async function restoreReviewScrollIfPending'),
  )

  it('title, body and both buttons', () => {
    expect(warning).toContain("title: 'Затвердити бриф зі змінами?'")
    expect(warning).toContain("primaryLabel: 'Затвердити зі змінами'")
    expect(warning).toContain("cancelLabel: 'Повернути на доопрацювання'")
    expect(warning).toContain(
      "body: 'Ви змінили вибір концепту або неймінгу. За потреби поверніть бриф на доопрацювання перед затвердженням.'",
    )
  })

  it('the old informational title and CTA are gone', () => {
    expect(warning).not.toContain("title: 'Ви внесли зміни до брифу'")
    expect(warning).not.toContain("primaryLabel: 'Затвердити бриф'")
  })

  it('the no-changes confirmation is untouched', () => {
    expect(warning).toContain("title: 'Затвердити бриф?'")
    expect(warning).toContain("primaryLabel: 'Затвердити'")
  })
})
