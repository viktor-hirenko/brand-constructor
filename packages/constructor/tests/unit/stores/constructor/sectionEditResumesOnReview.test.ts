import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createPinia, setActivePinia } from 'pinia'
import type { BrandStepData } from '@brand-constructor/shared/types'

const apiPut = vi.fn()
vi.mock('@/composables/useApi', () => ({
  apiPut: (...a: unknown[]) => apiPut(...a),
  apiPost: vi.fn(),
  apiGet: vi.fn(),
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
  apiErrorStatus: () => undefined,
}))

import { useConstructorStore } from '@/stores/constructor'

/**
 * H-60 (found 12.10 while the DP-15450 board was checked live). On the last
 * screen of a draft the author presses «Редагувати» in a section — Deliverables,
 * say — and «Зберегти». The wizard takes them back to the last screen. But the
 * section is edited on its own step's route, the store's step is that step, and
 * the save wrote it as the place to reopen the brief: closed and opened again,
 * the brief stood on step 6 of 8, and the last screen was two «Далі» away.
 *
 * The owner, 12.10: «Если мы уж сохранили и вернулись на последний экран, то
 * когда мы закрыли и открыли бриф, то да, он должен на последнем экране
 * открываться. Если же мы просто проходили визард и не дошли до финального
 * экрана, то… показывается на том экране, на котором закрыли. Ну, я не думаю,
 * что тут нужно всё переделывать, логику».
 *
 * So one thing changes and nothing else: a section saved from the last screen
 * says «reopen on the screen I came from». A plain «Далі» still writes the step
 * it is on.
 */

const ID = 'brand_h60'
const REVIEW = 8

function stepData(): BrandStepData {
  return {
    stepLayoutVersion: 2,
    brandBasics: { geo: ['UK'], launchDate: '2026-11-15', linkedProduct: '', comment: '' },
    mode: 'light',
    concept: { selectedId: 'con-retro', previewId: null, comment: '', newConceptBrief: null },
    externalNaming: { selectedIds: ['exn-bubbleton'], comment: '', newNamingBrief: null },
    internalNaming: { selectedId: 'inn-luna', comment: '', newNamingFeedback: null },
    marketingPackage: { selectedId: 'pkg-1', comment: '' },
    deliverables: { legalLanding: false, partnerLanding: false, developmentDeadline: '', comment: '' },
    visualComponents: { selections: {}, delegateToDesigners: true, comment: '' },
  }
}

const sentStep = () => (apiPut.mock.calls.at(-1)?.[1] as { currentStep?: number } | undefined)?.currentStep

beforeEach(() => {
  setActivePinia(createPinia())
  apiPut.mockReset().mockResolvedValue({ id: ID, status: 'draft', updatedAt: 'T2' })
})

describe('H-60: a section saved from the last screen reopens the brief on the last screen', () => {
  it('«Редагувати» Deliverables → «Зберегти»: the brief is told to reopen on the review, not on step 6', async () => {
    const store = useConstructorStore()
    store.loadBrand(ID, stepData(), REVIEW, 'draft')

    // What the last screen and the section's route do before «Зберегти».
    store.beginEditSection('deliverables', REVIEW)
    store.goToStep(6)
    store.stepData.deliverables.legalLanding = true

    expect(await store.saveBrand({ resumeStep: store.returnToStep ?? REVIEW })).toBe(true)

    expect(apiPut).toHaveBeenCalledTimes(1)
    expect(apiPut.mock.calls[0][0]).toBe(`/api/brands/${ID}`)
    expect(sentStep()).toBe(REVIEW)
    // The change itself is what was saved.
    expect((apiPut.mock.calls[0][1] as { legalLanding: boolean }).legalLanding).toBe(true)
  })

  it('every section the last screen edits this way: steps 1, 4, 5, 6 and 7', async () => {
    for (const [section, step] of [
      ['brandBasics', 1],
      ['internalNaming', 4],
      ['marketingPackage', 5],
      ['deliverables', 6],
      ['visualComponents', 7],
    ] as const) {
      setActivePinia(createPinia())
      const store = useConstructorStore()
      store.loadBrand(ID, stepData(), REVIEW, 'draft')
      store.beginEditSection(section, REVIEW)
      store.goToStep(step)

      await store.saveBrand({ resumeStep: store.returnToStep ?? REVIEW })
      expect(sentStep()).toBe(REVIEW)
    }
  })

  it('a plain «Далі» still writes the step the author is on — the brief reopens where they stopped', async () => {
    const store = useConstructorStore()
    store.loadBrand(ID, stepData(), 2, 'draft')

    store.goToStep(3)
    await store.saveBrand()
    expect(sentStep()).toBe(3)

    store.goToStep(4)
    await store.saveBrand()
    expect(sentStep()).toBe(4)
  })

  it('an absurd step to resume on is clamped to the wizard, like every other step', async () => {
    const store = useConstructorStore()
    store.loadBrand(ID, stepData(), REVIEW, 'draft')
    store.goToStep(6)

    await store.saveBrand({ resumeStep: 99 })
    expect(sentStep()).toBe(REVIEW)
  })

  it('the section save in the shell is the one that says where to reopen', () => {
    const shell = readFileSync(
      fileURLToPath(new URL('../../../../src/views/BriefShellView.vue', import.meta.url)),
      'utf8'
    )
    const handler = shell.slice(shell.indexOf('async function handleSaveSectionEdit()'))
    const body = handler.slice(0, handler.indexOf('\n}\n'))

    expect(body).toContain('store.saveBrand({ resumeStep: fallbackStep })')
    expect(body).not.toMatch(/store\.saveBrand\(\)/)
  })
})
