import { computed, getCurrentInstance, nextTick, onMounted, ref, watch } from 'vue'
import type { BrandCeoComments, BrandStepData } from '@brand-constructor/shared/types'

/**
 * Exit confirmation for the wizard header's × — DP-15450 `Concept Selection 8`
 * and `CEO view 6`.
 *
 * Both bugs ask for the same thing in two places: «Додати confirmation modal
 * (лише якщо користувач уже вніс зміни в бриф). Якщо змін немає — закривати
 * без підтвердження», and the CEO one with «уже вніс зміни/коменти».
 *
 * **The copy is hers, verbatim, and there are two of it** — not a choice
 * between two drafts. `5374:25673` sits over a Product owner's step 2,
 * `5387:89270` over the CEO view; same 450 frame, same row of two 197 buttons,
 * only the body differs. A returned brief is not in the drafts list, so the
 * author reads the CEO line there rather than a promise about «чернетки».
 */
export const BRIEF_EXIT_CONFIRM_COPY = {
  title: 'Вийти з брифу?',
  cancelLabel: 'Залишитись',
  primaryLabel: 'Вийти',
} as const

export const BRIEF_EXIT_CONFIRM_BODY = {
  /** `5374:25673` — the Product owner filling a draft. */
  draft: 'Усі зміни збережено. Ви зможете продовжити заповнення брифу пізніше з чернеток.',
  /** `5387:89270` — the CEO review; also any brief that is no longer a draft. */
  review: 'Усі зміни збережено. Ви зможете повернутися до брифу пізніше.',
} as const

export function resolveBriefExitConfirmBody(opts: { isCeo: boolean; brandStatus: string }): string {
  if (opts.isCeo || opts.brandStatus !== 'draft') return BRIEF_EXIT_CONFIRM_BODY.review
  return BRIEF_EXIT_CONFIRM_BODY.draft
}

export interface BriefChangeSource {
  stepData: BrandStepData
  ceoComments: BrandCeoComments | null
  ceoSelections: Record<string, string | string[]> | null
}

/**
 * What "the brief was changed" is compared on.
 *
 * The author's answers live in `stepData`; the CEO's comments and picks in the
 * two CEO maps, and an applied CEO variant writes into `stepData` too. So one
 * fingerprint of the three covers both roles.
 *
 * `concept.previewId` is left out: it is which concept the right panel is
 * showing, set by clicking a card to look at it. Looking is not a change.
 * An empty `mode` reads as `light`: step 2 fills it in on open for server
 * drafts that carry `null`, and the screen shows light either way.
 */
export function briefChangeFingerprint(source: BriefChangeSource): string {
  const { previewId: _previewId, ...concept } = source.stepData.concept
  return JSON.stringify({
    stepData: { ...source.stepData, concept, mode: source.stepData.mode ?? 'light' },
    ceoComments: source.ceoComments ?? null,
    ceoSelections: source.ceoSelections ?? null,
  })
}

interface UseBriefExitConfirmOptions {
  source: () => BriefChangeSource
  /** Re-baselines when a different brief is loaded into the same shell. */
  briefId: () => string | null
  /** Persists before leaving, so «Усі зміни збережено» is true. Resolves `false` to stay. */
  persist: () => Promise<boolean>
  leave: () => void
}

/**
 * The baseline is taken once the shell and its first step have mounted — the
 * route guards have hydrated the store by then — and again whenever another
 * brief is loaded. A change is anything that differs from it, whether or not it
 * has already been saved with «Далі»: the designer's condition is "the user
 * has changed the brief", not "there is something unsaved".
 */
export function useBriefExitConfirm(opts: UseBriefExitConfirmOptions) {
  const baseline = ref<string | null>(null)
  const open = ref(false)
  const leaving = ref(false)

  function takeBaseline(): void {
    baseline.value = briefChangeFingerprint(opts.source())
  }

  if (getCurrentInstance()) {
    onMounted(() => {
      void nextTick(takeBaseline)
    })
  }

  watch(opts.briefId, (next, prev) => {
    if (next !== prev) void nextTick(takeBaseline)
  })

  const hasChanges = computed(
    () => baseline.value !== null && briefChangeFingerprint(opts.source()) !== baseline.value,
  )

  function requestExit(): void {
    if (open.value) return
    if (!hasChanges.value) {
      opts.leave()
      return
    }
    open.value = true
  }

  function stay(): void {
    if (leaving.value) return
    open.value = false
  }

  async function confirmExit(): Promise<void> {
    if (leaving.value) return
    leaving.value = true
    try {
      if (!(await opts.persist())) return
      open.value = false
      opts.leave()
    } finally {
      leaving.value = false
    }
  }

  return { open, leaving, hasChanges, takeBaseline, requestExit, stay, confirmExit }
}
