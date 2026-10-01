import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { BrandStepData } from '@brand-constructor/shared/types'
import {
  BRIEF_EXIT_CONFIRM_BODY,
  BRIEF_EXIT_CONFIRM_COPY,
  briefChangeFingerprint,
  resolveBriefExitConfirmBody,
  useBriefExitConfirm,
  type BriefChangeSource,
} from '@/composables/useBriefExitConfirm'
import { BRIEF_FORM_DISCARD_CONFIRM_COPY } from '@/components/constructor/modals/briefFormDiscard'

/**
 * ── DP-15450, work 05: confirmations, so typed input is not lost ──
 *
 *   Concept Selection 7 · MEDIUM — «Клік поза модалкою одразу закриває її та
 *   скидає вже введені дані. → Не закривати модалку по кліку на overlay, якщо
 *   форма змінена. При закритті через × / «Скасувати» показувати
 *   підтвердження про втрату незбережених даних.»
 *
 *   Concept Selection 8 · MEDIUM — «При виході з Brand Creation через × зараз
 *   немає підтвердження … → Додати confirmation modal (лише якщо користувач
 *   уже вніс зміни в бриф). Якщо змін немає — закривати без підтвердження.»
 *
 *   CEO view 6 · MEDIUM — «При виході з Brief Review через × зараз немає
 *   підтвердження … → Додати confirmation modal (лише якщо CEO уже вніс
 *   зміни/коменти). Якщо змін немає — закривати без підтвердження.»
 *
 * **Her two exit drawings are not two drafts of one window.** `5374:25673`
 * sits over a Product owner's step 2, `5387:89270` over the CEO view; both are
 * a 450 frame with «Залишитись» / «Вийти» in ONE ROW of two 197 buttons — the
 * "buttons in a column" of the handover prompt is on neither. They differ in
 * the body line only, and each belongs to its own bug.
 *
 * Tests read the SOURCE for bindings: `vitest.config.ts` runs in `node`.
 */

const SRC = resolve(__dirname, '../../../src')
const read = (rel: string) => readFileSync(resolve(SRC, rel), 'utf8')
const templateOf = (source: string) => source.slice(source.indexOf('<template>'))
/** The script half, with comments stripped — a binding, not a mention. */
const codeOf = (source: string) =>
  source
    .slice(0, source.indexOf('<template>'))
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')

function stepData(overrides: Partial<BrandStepData['concept']> = {}): BrandStepData {
  return {
    concept: { selectedId: 'c1', previewId: 'c1', comment: '', newConceptBrief: null, ...overrides },
    brandBasics: { geo: ['UA'], launchDate: '' },
  } as unknown as BrandStepData
}

function source(over: Partial<BriefChangeSource> = {}): BriefChangeSource {
  return { stepData: stepData(), ceoComments: null, ceoSelections: null, ...over }
}

describe('the exit question carries her copy, word for word', () => {
  it('title and buttons', () => {
    expect(BRIEF_EXIT_CONFIRM_COPY).toEqual({
      title: 'Вийти з брифу?',
      cancelLabel: 'Залишитись',
      primaryLabel: 'Вийти',
    })
  })

  it('5374:25673 for the author of a draft, 5387:89270 for the CEO', () => {
    expect(BRIEF_EXIT_CONFIRM_BODY.draft).toBe(
      'Усі зміни збережено. Ви зможете продовжити заповнення брифу пізніше з чернеток.',
    )
    expect(BRIEF_EXIT_CONFIRM_BODY.review).toBe(
      'Усі зміни збережено. Ви зможете повернутися до брифу пізніше.',
    )
  })

  it('the drafts line is promised only where the brief is a draft', () => {
    expect(resolveBriefExitConfirmBody({ isCeo: false, brandStatus: 'draft' })).toBe(
      BRIEF_EXIT_CONFIRM_BODY.draft,
    )
    expect(resolveBriefExitConfirmBody({ isCeo: true, brandStatus: 'submitted' })).toBe(
      BRIEF_EXIT_CONFIRM_BODY.review,
    )
    expect(resolveBriefExitConfirmBody({ isCeo: false, brandStatus: 'needs_revision' })).toBe(
      BRIEF_EXIT_CONFIRM_BODY.review,
    )
    // a brief «В роботі» is no longer in the drafts list either
    expect(resolveBriefExitConfirmBody({ isCeo: false, brandStatus: 'in_work' })).toBe(
      BRIEF_EXIT_CONFIRM_BODY.review,
    )
  })
})

describe('what counts as "the brief was changed"', () => {
  it('looking at another concept is not a change', () => {
    expect(briefChangeFingerprint(source({ stepData: stepData({ previewId: 'c9' }) }))).toBe(
      briefChangeFingerprint(source()),
    )
  })

  it('step 2 filling an empty theme with light on open is not a change', () => {
    const empty = { ...stepData(), mode: null } as unknown as BrandStepData
    const light = { ...stepData(), mode: 'light' } as unknown as BrandStepData
    const dark = { ...stepData(), mode: 'dark' } as unknown as BrandStepData
    expect(briefChangeFingerprint(source({ stepData: empty }))).toBe(
      briefChangeFingerprint(source({ stepData: light })),
    )
    expect(briefChangeFingerprint(source({ stepData: dark }))).not.toBe(
      briefChangeFingerprint(source({ stepData: light })),
    )
  })

  it("an author's answer is a change", () => {
    expect(briefChangeFingerprint(source({ stepData: stepData({ selectedId: 'c2' }) }))).not.toBe(
      briefChangeFingerprint(source()),
    )
  })

  it("a CEO comment and a CEO pick are changes", () => {
    const base = briefChangeFingerprint(source())
    expect(
      briefChangeFingerprint(
        source({ ceoComments: { general: { value: 'x', resolved: false, resolvedAt: null } } }),
      ),
    ).not.toBe(base)
    expect(briefChangeFingerprint(source({ ceoSelections: { concept: 'c3' } }))).not.toBe(base)
  })
})

describe('the × asks only once something changed', () => {
  function setup(persistResult = true) {
    let current = source()
    const leave = vi.fn()
    const persist = vi.fn(async () => persistResult)
    const guard = useBriefExitConfirm({
      source: () => current,
      briefId: () => 'b1',
      persist,
      leave,
    })
    guard.takeBaseline()
    return {
      guard,
      leave,
      persist,
      change: () => {
        current = source({ stepData: stepData({ selectedId: 'c2' }) })
      },
    }
  }

  it('nothing changed: leaves at once, no question, nothing saved', () => {
    const { guard, leave, persist } = setup()
    guard.requestExit()
    expect(guard.open.value).toBe(false)
    expect(leave).toHaveBeenCalledOnce()
    expect(persist).not.toHaveBeenCalled()
  })

  it('changed: asks, and «Залишитись» keeps the user where they were', () => {
    const { guard, leave, change } = setup()
    change()
    guard.requestExit()
    expect(guard.open.value).toBe(true)
    expect(leave).not.toHaveBeenCalled()
    guard.stay()
    expect(guard.open.value).toBe(false)
    expect(leave).not.toHaveBeenCalled()
  })

  it('«Вийти» saves first, then leaves — «Усі зміни збережено» has to be true', async () => {
    const { guard, leave, persist, change } = setup()
    change()
    guard.requestExit()
    await guard.confirmExit()
    expect(persist).toHaveBeenCalledOnce()
    expect(leave).toHaveBeenCalledOnce()
    expect(persist.mock.invocationCallOrder[0]).toBeLessThan(leave.mock.invocationCallOrder[0])
    expect(guard.open.value).toBe(false)
  })

  it('a failed save does not leave', async () => {
    const { guard, leave, change } = setup(false)
    change()
    guard.requestExit()
    await guard.confirmExit()
    expect(leave).not.toHaveBeenCalled()
    expect(guard.open.value).toBe(true)
  })
})

describe('Concept Selection 8 / CEO view 6 — the wizard header × is wired to the question', () => {
  const shell = read('views/BriefShellView.vue')
  const code = codeOf(shell)
  const tpl = templateOf(shell)

  it('the header × goes through the guard, not straight out', () => {
    expect(tpl).toMatch(/<UiWizardHeader[^>]*@close="handleWizardClose"/)
    expect(code).toMatch(/function handleWizardClose\(\): void \{\s*exitConfirm\.requestExit\(\)\s*\}/)
    expect(code).toMatch(/leave: leaveWizard\b/)
  })

  it('the question is bound to her copy and to the guard', () => {
    const modal = tpl.slice(tpl.indexOf('<ConfirmationModal'), tpl.indexOf('/>', tpl.indexOf('<ConfirmationModal')))
    expect(modal).toContain('v-if="exitConfirm.open.value"')
    expect(modal).toContain(':title="BRIEF_EXIT_CONFIRM_COPY.title"')
    expect(modal).toContain(':body="exitConfirmBody"')
    expect(modal).toContain(':cancel-label="BRIEF_EXIT_CONFIRM_COPY.cancelLabel"')
    expect(modal).toContain(':primary-label="BRIEF_EXIT_CONFIRM_COPY.primaryLabel"')
    expect(modal).toContain('@cancel="exitConfirm.stay"')
    expect(modal).toContain('@primary="exitConfirm.confirmExit"')
  })

  it('compares the author answers AND the CEO comments and picks', () => {
    expect(code).toMatch(/stepData: store\.stepData,/)
    expect(code).toMatch(/ceoComments: store\.brandCeoComments,/)
    expect(code).toMatch(/ceoSelections: store\.brandCeoSelections,/)
  })

  it('saves only an author on a plain draft step — never mid section edit', () => {
    const body = code.slice(code.indexOf('function persistBeforeExit'), code.indexOf('const exitConfirm'))
    expect(body).toContain('!authStore.isCeo')
    expect(body).toContain("store.brandStatus === 'draft'")
    expect(body).toContain('!isViewMode.value')
    expect(body).toContain('!store.editingSection')
    expect(body).toContain('store.saveBrand()')
  })
})

describe('Concept Selection 7 — a changed brief form does not close by accident', () => {
  const shell = read('components/constructor/modals/BriefModalShell.vue')
  const code = codeOf(shell)
  const tpl = templateOf(shell)

  it('the backdrop is switched off exactly while the form is changed', () => {
    expect(tpl).toMatch(/<UiModal[^>]*:close-on-backdrop="!guarded"/)
    expect(code).toMatch(/const guarded = computed\(\(\) => props\.dirty && !props\.readonly\)/)
  })

  it('×, Esc and «Скасувати» all go through the question', () => {
    expect(tpl).toMatch(/<UiModal[^>]*@close="requestCancel"/)
    expect(tpl).toMatch(/variant="secondary" @click="requestCancel"/)
    expect(tpl).not.toContain(`@click="emit('cancel')"`)
    expect(tpl).not.toContain(`@close="emit('cancel')"`)
  })

  it('an open question swallows the Esc that also reaches the form', () => {
    expect(code).toMatch(/function requestCancel\(\): void \{\s*if \(discardConfirmOpen\.value\) return/)
  })

  it('the question closes the form only on its primary button', () => {
    const modal = tpl.slice(tpl.indexOf('<ConfirmationModal'))
    expect(modal).toContain('v-if="discardConfirmOpen"')
    expect(modal).toContain('@primary="discard"')
    expect(modal).toContain('@cancel="discardConfirmOpen = false"')
    expect(modal).toContain(':title="BRIEF_FORM_DISCARD_CONFIRM_COPY.title"')
  })

  it('all three order forms report whether they were changed', () => {
    for (const file of ['NewConceptModal.vue', 'NewNamingModal.vue', 'NewInternalNamingModal.vue']) {
      const tplOfForm = templateOf(read(`components/constructor/modals/${file}`))
      expect(tplOfForm, file).toMatch(/<BriefModalShell\s[^>]*:dirty="isDirty"/)
    }
  })

  it('every other modal keeps closing on the backdrop', () => {
    expect(read('components/ui/UiModal.vue')).toMatch(/closeOnBackdrop: true,/)
  })

  it('the copy of the question is one place, and it keeps her «Залишитись»', () => {
    expect(BRIEF_FORM_DISCARD_CONFIRM_COPY.cancelLabel).toBe('Залишитись')
    expect(BRIEF_FORM_DISCARD_CONFIRM_COPY.title.length).toBeGreaterThan(0)
  })
})
