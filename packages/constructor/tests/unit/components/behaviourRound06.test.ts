import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ref } from 'vue'
import type { BrandStepData } from '@brand-constructor/shared/types'
import { needsExternalNamingReselect } from '@/utils/draftConceptCascade'
import { useSupervisorAlternativeDraft } from '@/stores/constructor/useSupervisorAlternativeDraft'
import {
  SIDEBAR_SCROLL_HINT_STORAGE_KEY,
  shouldShowSidebarScrollHint,
  useSidebarScrollHint,
} from '@/composables/useSidebarScrollHint'
import { SIDEBAR_SCROLL_HINT_MESSAGE } from '@/constants/visualComponentPreviewMessages'

/**
 * ── DP-15450, work 06: four remarks about behaviour ──────────────────────────
 *
 *   Final review 2 · MEDIUM — «Після редагування секції та повернення назад
 *   сторінка відкривається зверху, через що користувач втрачає контекст. →
 *   Відновлювати попередню позицію скролу або прокручувати до секції, з якої
 *   користувач перейшов у редагування.»
 *
 *   Final review 5 · HIGH — the ordered-concept edge case: after re-picking a
 *   library concept from the review, External Naming stayed empty and the send
 *   button stayed live. «→ Після вибору концепту автоматично перейти до вибору
 *   External Naming.»
 *
 *   CEO view 3 · MEDIUM — «При переході до зміни External Naming вибір
 *   замовника одразу позначений галочкою… → Не проставляти selected-state за
 *   замовчуванням (але залишити SEO можливість обрати його повторно разом з
 *   іншими варіантами).»
 *
 *   Interface Components 3 · MEDIUM — «Неочевидно, що preview можна скролити. →
 *   Додати hint… Показувати hint один раз при першій взаємодії з таким preview
 *   і прибирати після scroll.» Text off her tooltip `5382:33752`.
 *
 * Rules are pure functions tested directly; bindings are read from the SOURCE,
 * because `vitest.config.ts` runs in `node` and these views cannot be mounted.
 * Every name check below carries a name boundary — a bare `toContain` stays
 * true for a renamed tag whose old name is a prefix of the new one.
 */

const SRC = resolve(__dirname, '../../../src')
const read = (rel: string) => readFileSync(resolve(SRC, rel), 'utf8')

/** Body of `function <name>(…) {…}` up to the next top-level `\n}`. */
function functionBody(source: string, name: string): string {
  const start = source.indexOf(`function ${name}(`)
  expect(start, `function ${name} not found`).toBeGreaterThan(-1)
  const end = source.indexOf('\n}\n', start)
  return source.slice(start, end)
}

// ─── Final review 2 ─────────────────────────────────────────────────────────

describe('Final review 2 — the review remembers where the author left it', () => {
  const review = read('views/wizard/BriefReviewView.vue')
  const editSection = functionBody(review, 'editSection')

  it('every route out of «Редагувати» goes through the one that saves the position', () => {
    expect(editSection).toMatch(
      /const leaveForEdit = \(to: RouteLocationRaw\) => \{\s*if \(bid\) saveReviewScrollPosition\(bid, reviewUnifiedViewRef\.value\?\.getScrollTop\(\) \?\? 0\)\s*router\.push\(to\)/,
    )
    // Five exits: three returned-from-CEO routes, the draft concept flow, the step.
    expect(editSection.match(/\bleaveForEdit\(/g)?.length).toBe(5)
    // …and no exit that skips it.
    const pushes = editSection.match(/\brouter\.push\(/g) ?? []
    expect(pushes.length).toBe(1)
  })

  it('the modal branch stays on the review and saves nothing', () => {
    const modalBranch = editSection.slice(
      editSection.indexOf('if (apply.hasConceptMismatch.value) {'),
      editSection.indexOf('const query = apply.isCeoExternalApplied'),
    )
    expect(modalBranch).toContain('showEditExternalBeforeConceptModal.value = true')
    expect(modalBranch).not.toMatch(/\bleaveForEdit\(|\bsaveReviewScrollPosition\(/)
  })

  it('the review consumes the saved position when it mounts again', () => {
    expect(functionBody(review, 'restoreReviewScrollIfPending')).toMatch(
      /consumeReviewScrollPosition\(brandId\)[\s\S]*setScrollTop\(scrollTop\)/,
    )
    expect(review).toMatch(/onMounted\(async \(\) => \{[\s\S]*?await restoreReviewScrollIfPending\(\)/)
  })
})

// ─── Final review 5 ─────────────────────────────────────────────────────────

describe('Final review 5 — a re-picked library concept always asks for External Naming', () => {
  it('her edge case: concept ordered first, library concept picked in the edit', () => {
    expect(
      needsExternalNamingReselect({ nextConceptId: 'c-lib', baselineConceptId: null, isBriefConcept: false }),
    ).toBe(true)
  })

  it('a switch between two library concepts still chains, as before', () => {
    expect(
      needsExternalNamingReselect({ nextConceptId: 'c-2', baselineConceptId: 'c-1', isBriefConcept: false }),
    ).toBe(true)
  })

  it('no change, or an ordered concept, returns straight to the review', () => {
    expect(
      needsExternalNamingReselect({ nextConceptId: 'c-1', baselineConceptId: 'c-1', isBriefConcept: false }),
    ).toBe(false)
    expect(
      needsExternalNamingReselect({ nextConceptId: null, baselineConceptId: 'c-1', isBriefConcept: true }),
    ).toBe(false)
  })

  it('«Далі» on the edit screen is bound to that rule and chains to the naming screen', () => {
    const view = read('views/draft-edit/DraftConceptEditView.vue')
    const goDali = functionBody(view, 'goDali')
    expect(goDali).toMatch(/const chainToExternal = needsExternalNamingReselect\(\{/)
    expect(goDali).toMatch(
      /if \(chainToExternal\) \{[\s\S]*?router\.push\(`\/constructor\/brand\/\$\{brandId\.value\}\/draft-edit\/concept\/external-naming`\)\s*return/,
    )
    // The old gate — «only if the brief already had names» — is what let her case through.
    expect(goDali).not.toMatch(/\bhadExternalPicks\b/)
  })
})

// ─── CEO view 3 ─────────────────────────────────────────────────────────────

function makeStepData(): BrandStepData {
  return {
    stepLayoutVersion: 2,
    brandBasics: { geo: [], launchDate: '', linkedProduct: '', comment: '' },
    mode: 'light',
    concept: { selectedId: 'concept-a', previewId: null, comment: '', newConceptBrief: null },
    externalNaming: { selectedIds: ['po-1', 'po-2'], comment: '', newNamingBrief: null },
    internalNaming: { selectedId: null, comment: '', newNamingFeedback: null },
    marketingPackage: { selectedId: null, comment: '' },
    deliverables: { legalLanding: false, partnerLanding: false, developmentDeadline: '', comment: '' },
    visualComponents: { selections: {}, delegateToDesigners: false, comment: '' },
  } as BrandStepData
}

describe('CEO view 3 — the customer’s names are not ticked on entry', () => {
  it('with nothing saved by the CEO, the External Naming draft opens empty', () => {
    const sut = useSupervisorAlternativeDraft({
      stepData: ref(makeStepData()),
      brandSupervisorSelections: ref(null),
      brandId: ref(null),
    })
    sut.seedSupervisorAlternativeFromBrand('externalNaming')
    expect(sut.supervisorAlternativeDraft.value.externalNamingIds).toEqual([])
  })

  it('the CEO’s own saved names still come back ticked', () => {
    const sut = useSupervisorAlternativeDraft({
      stepData: ref(makeStepData()),
      brandSupervisorSelections: ref({ externalNaming: ['ceo-1'] }),
      brandId: ref(null),
    })
    sut.seedSupervisorAlternativeFromBrand('externalNaming')
    expect(sut.supervisorAlternativeDraft.value.externalNamingIds).toEqual(['ceo-1'])
  })

  it('the customer’s names stay pickable — row above the grid, with select-all', () => {
    const view = read('views/alternative-selection/AlternativeExternalNamingView.vue')
    expect(view).toMatch(/<AuthorNamingsRow\s[^>]*:namings="poExternalMini"[^>]*\bselectable\b/)
    expect(view).toMatch(/<AuthorNamingsRow\s[^>]*@toggle="handleToggle"[^>]*@select-all="handleSelectAllPoNamings"/)
  })
})

// ─── Interface Components 3 ─────────────────────────────────────────────────

describe('Interface Components 3 — the scroll hint over the step 7 Sidebar', () => {
  it('her text, word for word', () => {
    expect(SIDEBAR_SCROLL_HINT_MESSAGE).toBe('Прокрутіть, щоб переглянути весь Sidebar')
  })

  it('shows only while the layer is up and nobody has scrolled it', () => {
    expect(shouldShowSidebarScrollHint(true, false)).toBe(true)
    expect(shouldShowSidebarScrollHint(true, true)).toBe(false)
    expect(shouldShowSidebarScrollHint(false, false)).toBe(false)
  })

  describe('once per browser', () => {
    let store: Map<string, string>
    beforeEach(() => {
      store = new Map()
      ;(globalThis as { localStorage?: unknown }).localStorage = {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
      }
    })
    afterEach(() => {
      delete (globalThis as { localStorage?: unknown }).localStorage
    })

    it('the first scroll retires it, and a new visit does not bring it back', () => {
      const shown = ref(true)
      const first = useSidebarScrollHint(shown)
      expect(first.visible.value).toBe(true)
      first.markScrolled()
      expect(first.visible.value).toBe(false)
      expect(store.get(SIDEBAR_SCROLL_HINT_STORAGE_KEY)).toBe('1')
      expect(useSidebarScrollHint(ref(true)).visible.value).toBe(false)
    })

    it('hiding the layer with the eye is not a scroll — it comes back with the layer', () => {
      const shown = ref(true)
      const hint = useSidebarScrollHint(shown)
      shown.value = false
      expect(hint.visible.value).toBe(false)
      shown.value = true
      expect(hint.visible.value).toBe(true)
    })

    it('storage that throws leaves the hint working for the page', () => {
      ;(globalThis as { localStorage?: unknown }).localStorage = {
        getItem: () => { throw new Error('blocked') },
        setItem: () => { throw new Error('blocked') },
      }
      const hint = useSidebarScrollHint(ref(true))
      expect(hint.visible.value).toBe(true)
      hint.markScrolled()
      expect(hint.visible.value).toBe(false)
    })
  })

  it('the Sidebar list reports its scroll', () => {
    const sidebar = read('components/constructor/preview/PhonePreviewSidebar.vue')
    expect(sidebar).toMatch(
      /class="phone-preview-sidebar__scroll [^"]*"\s*@scroll\.passive="emit\('scrolled'\)"/,
    )
  })

  it('step 7 draws the hint on its rule and retires it on that scroll', () => {
    const panel = read('components/constructor/layout/StepPreviewRightPanel.vue')
    expect(panel).toMatch(/<SidebarScrollHint v-if="sidebarScrollHint\.visible\.value" \/>/)
    expect(panel).toMatch(
      /<PhonePreviewSidebar\s+:slice="step7OverlaySlice"\s+:unit-rem="unitRem"\s+@scrolled="sidebarScrollHint\.markScrolled"/,
    )
    expect(panel).toMatch(
      /props\.currentStep === 7 && !!props\.step7OverlaySlice && props\.step9SidebarVisible/,
    )
    // Outside the scroll area, which would clip it: before the header, in the root.
    const step7 = panel.slice(panel.indexOf('<template v-else-if="currentStep === 7">'))
    expect(step7.indexOf('<SidebarScrollHint')).toBeLessThan(step7.indexOf(':class="PREVIEW_PANEL_SCROLL_CLASS"'))
  })

  it('the tooltip is her node: 182 wide, bubble #2d2d39 r8 p12, 12/16 white, 6 below the content top', () => {
    const hint = read('components/constructor/preview/SidebarScrollHint.vue')
    const tpl = hint.slice(hint.indexOf('<template>'))
    expect(tpl).toContain('{{ SIDEBAR_SCROLL_HINT_MESSAGE }}')
    expect(tpl).toMatch(/class="sidebar-scroll-hint pointer-events-none absolute left-1\/2 top-1\.5 z-40 flex w-\[11\.375rem\] -translate-x-1\/2 flex-col items-center"/)
    expect(tpl).toMatch(/class="w-full rounded-lg bg-\[#2d2d39\] p-3 text-xs leading-4 font-normal text-white"/)
    expect(tpl).toContain('viewBox="0 0 16 8"')
  })
})
