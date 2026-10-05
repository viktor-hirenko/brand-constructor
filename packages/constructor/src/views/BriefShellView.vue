<script setup lang="ts">
import { computed, watch, ref, onMounted, provide, onUnmounted } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { useConstructorStore } from '@/stores/constructor'
import { useAuthStore } from '@/stores/auth'
import { apiGet } from '@/composables/useApi'
import { useLibrariesStore } from '@/stores/libraries'
import { useBrandPreviewLayers, type PreviewSlice } from '@/composables/useBrandPreviewLayers'
import {
  DESIGN_SHELL_HEIGHT,
  DESIGN_SHELL_MIN_VIEWPORT_WIDTH,
  DESIGN_SHELL_WIDTH,
} from '@/constants/layoutShell'
import { useViewportScale } from '@/composables/useViewportScale'
import { isEmbedded } from '@/composables/useEmbedMode'
import { useBrandBriefReviewPhase, BRAND_BRIEF_REVIEW_PHASE } from '@/composables/useBrandBriefReviewPhase'
import ConceptPreviewSlider from '@/components/constructor/preview/ConceptPreviewSlider.vue'
import ConceptPreviewSliderSkeleton from '@/components/constructor/skeletons/ConceptPreviewSliderSkeleton.vue'
import ConceptMobilePreview from '@/components/constructor/preview/ConceptMobilePreview.vue'
import ConceptMobilePreviewSkeleton from '@/components/constructor/skeletons/ConceptMobilePreviewSkeleton.vue'
import BrandPreviewPanel from '@/components/constructor/preview/BrandPreviewPanel.vue'
import ConstructorDualPaneShell from '@/components/constructor/layout/ConstructorDualPaneShell.vue'
import StepPreviewRightPanel from '@/components/constructor/layout/StepPreviewRightPanel.vue'
import LayoutPreviewOverlays from '@/components/constructor/layout/LayoutPreviewOverlays.vue'
import ConceptGalleryDrawer from '@/components/constructor/preview/ConceptGalleryDrawer.vue'
import {
  SIDEBAR_HIDDEN_CALLOUT_DURATION_MS,
} from '@/constants/visualComponentPreviewMessages'
import {
  VISUAL_COMPONENT_PREVIEW_KEY,
} from '@/composables/visualComponentPreviewContext'
import UiFooter from '@/components/ui/UiFooter.vue'
import UiStepHeader from '@/components/ui/UiStepHeader.vue'
import UiWizardHeader from '@/components/ui/UiWizardHeader.vue'
import { postClose } from '@/composables/useEmbedBridge'
import SupervisorBriefGateView from '@/components/constructor/review/SupervisorBriefGateView.vue'
import CornerUpLeftIcon from '@/components/icons/CornerUpLeftIcon.vue'
import ConceptPreviewEmptySkeleton from '@/components/constructor/skeletons/ConceptPreviewEmptySkeleton.vue'
import { wizardStepLocation } from '@/utils/brandHydration'
import ConfirmationModal from '@/components/ui/ConfirmationModal.vue'
import UiModal from '@/components/ui/UiModal.vue'
import UiButton from '@/components/ui/UiButton.vue'
import { briefChangedElsewhereCopy } from '@/utils/briefChangedElsewhere'
import {
  BRIEF_EXIT_CONFIRM_COPY,
  resolveBriefExitConfirmBody,
  useBriefExitConfirm,
} from '@/composables/useBriefExitConfirm'
import type { Concept } from '@brand-constructor/shared/types'
import { conceptEditSliderLabel } from '@/utils/conceptEditSliderLabel'

const route = useRoute()
const router = useRouter()
const store = useConstructorStore()
const authStore = useAuthStore()
const librariesStore = useLibrariesStore()

// Embedded (Admin iframe): fluid root-font scaling replaces the CSS transform
// scale, so the shell fills the panel. Standalone keeps the fixed-card scale.
const embedded = isEmbedded()

const { scale: shellScale } = useViewportScale({
  baseWidth: DESIGN_SHELL_WIDTH,
  baseHeight: DESIGN_SHELL_HEIGHT,
  minViewportWidth: DESIGN_SHELL_MIN_VIEWPORT_WIDTH,
  disabled: embedded,
})

/**
 * Derive the current interactive phase from status + role + route meta.
 * Replaces the six manual phase flags that previously lived in this component.
 */
const {
  reviewPhase,
  isAlternativeSelection,
  isRevisionResponse,
  isSupervisorReview,
  isSupervisorAwaitingTeam,
  isAuthorReturned,
  isApprovedPhase,
  isReviewShell,
  layoutMode,
} = useBrandBriefReviewPhase()

const currentStep = computed(() => (route.meta.step as number) || 1)

/**
 * Step shown in the wizard header (counter + progress). Usually the route step;
 * the draft-edit screens live under step 8 for the flow's sake but show the
 * step they edit — `5387:99707` reads «2/8», `5387:99881` «3/8».
 */
const headerStep = computed(() => (route.meta.headerStep as number | undefined) ?? currentStep.value)

/**
 * The CEO's screens name themselves «Brief Review» and carry no step counter
 * or progress — `5387:78989`, `5387:83810` and the reselect screens of
 * `5387:101072` all draw the bare title over a 1px rule. The counter and the
 * black fill belong to the author's wizard.
 */
const isCeoHeader = computed(() => isSupervisorReview.value || isAlternativeSelection.value)
/**
 * The author's screens after the CEO returned the brief — the review and every
 * `po-edit/*` screen it opens — are «Brief Revision», no counter, no progress:
 * `5387:105225`, `5395:107475`, `5395:107506`, `5395:111458`. The draft-edit
 * screens share the revision phase but keep the wizard header, hence the route.
 */
const isRevisionHeader = computed(
  () => isAuthorReturned.value || String(route.name ?? '').startsWith('po-edit')
)
const isNamedHeader = computed(() => isCeoHeader.value || isRevisionHeader.value)
const wizardHeaderTitle = computed(() =>
  isCeoHeader.value ? 'Brief Review' : isRevisionHeader.value ? 'Brief Revision' : undefined
)
const wizardHeaderStep = computed(() => (isNamedHeader.value ? undefined : headerStep.value))
const wizardHeaderTotal = computed(() => (isNamedHeader.value ? undefined : totalSteps))

watch(
  currentStep,
  step => {
    store.goToStep(step)
    if (store.returnToStep && step === store.returnToStep) {
      store.setReturnToStep(null)
    }
  },
  { immediate: true }
)

/**
 * A failed save is shown under the buttons of the screen it happened on
 * (H-06). It belongs to that screen: leaving it — «Назад», the browser's back,
 * an edit screen — must not carry the red line along.
 */
watch(
  () => route.path,
  () => {
    store.saveError = null
  }
)

/**
 * The brief was sent (or otherwise moved on) from another tab — H-29, D-61.
 * This tab cannot save anything any more, so the window has one action and
 * closing it does the same: a full load of the brief as the server has it.
 */
const changedElsewhereCopy = computed(() =>
  store.changedElsewhereStatus ? briefChangedElsewhereCopy(store.changedElsewhereStatus) : null
)

function reloadChangedBrief(): void {
  if (!store.brandId) {
    window.location.reload()
    return
  }
  window.location.assign(
    router.resolve({ name: 'brand-view-review', params: { id: store.brandId } }).href
  )
}

const stepTitle = computed(() => {
  if (currentStep.value === 8 && store.brandInternalName) {
    return store.brandInternalName
  }
  return (route.meta.title as string) || ''
})
const stepSubtitle = computed(() => (route.meta.subtitle as string) || '')
const totalSteps = 8

/**
 * The kit's close control (`Wizard header` `5382:30951`): in the Admin it does
 * what the Admin's own "← Brands" button does, because that is the only way out
 * of a brand the product has; standalone it returns to the wizard landing.
 */
function leaveWizard(): void {
  if (embedded) {
    postClose()
    return
  }
  void router.push('/')
}

/**
 * DP-15450 `Concept Selection 8` / `CEO view 6`: the × asks first, but only
 * once the brief was changed — see `useBriefExitConfirm`.
 *
 * «Вийти» has to make her «Усі зміни збережено» true. The wizard writes to the
 * server on «Далі» only, so an author on a plain step gets the same save «Далі»
 * does. Everywhere else there is nothing to add: the CEO's comments are kept
 * locally as they are typed and an applied pick is saved when it is applied,
 * and a section being re-edited from the final review is not committed behind
 * the user's back — that is the half-done cascade of `Final review 5`.
 */
function persistBeforeExit(): Promise<boolean> {
  const plainAuthorStep =
    !authStore.isCeo &&
    store.brandStatus === 'draft' &&
    !isViewMode.value &&
    !store.editingSection
  return plainAuthorStep ? store.saveBrand() : Promise.resolve(true)
}

const exitConfirm = useBriefExitConfirm({
  source: () => ({
    stepData: store.stepData,
    ceoComments: store.brandCeoComments,
    ceoSelections: store.brandCeoSelections,
  }),
  briefId: () => store.brandId,
  persist: persistBeforeExit,
  leave: leaveWizard,
})

const exitConfirmBody = computed(() =>
  resolveBriefExitConfirmBody({ isCeo: authStore.isCeo, brandStatus: store.brandStatus }),
)

function handleWizardClose(): void {
  exitConfirm.requestExit()
}

const isFirstStep = computed(() => currentStep.value === 1)
const isLastStep = computed(() => currentStep.value === totalSteps)
const isFullWidth = computed(() => [5, 6].includes(currentStep.value))
const isViewMode = computed(() => route.path.startsWith('/constructor/brand/'))

const shellFullWidth = computed(
  () => isFullWidth.value && !isAlternativeSelection.value && !isRevisionResponse.value
)

const showRightPane = computed(() => !shellFullWidth.value)

const concepts = computed(() => librariesStore.concepts)

const brandBasics = computed(() => store.stepData?.brandBasics)

const selectedConcept = computed(() => {
  const id = store.stepData?.concept?.selectedId
  if (!id) return null
  return concepts.value.find(item => item.id === id) ?? null
})

const conceptPreviewForSlider = computed(() => {
  const id = store.stepData?.concept?.previewId ?? store.stepData?.concept?.selectedId
  if (!id) return null
  return concepts.value.find(item => item.id === id) ?? null
})

/** Step 2: concept id in store while libraries load → slider skeleton (with header). */
const step2HasStoredConceptSelection = computed(() => {
  const id = store.stepData?.concept?.previewId ?? store.stepData?.concept?.selectedId
  return !!id
})

/** Steps 3/4: PO ordered a custom concept brief instead of picking from the grid. */
const hasOrderedNewConcept = computed(
  () => store.stepData.concept.newConceptBrief !== null,
)

const isConceptSliderFinalSelected = computed(() => {
  const c = conceptPreviewForSlider.value
  if (!c) return false
  return store.stepData.concept.selectedId === c.id
})

const poConceptId = computed(() => store.stepData.concept.selectedId)

/** True when CEO has a persisted concept override — drives which skeleton to show. */
const hasCeoSavedConceptOverride = computed(() => {
  const sel = store.brandCeoSelections?.concept
  if (!sel) return false
  if (typeof sel === 'string') return sel.length > 0
  if (Array.isArray(sel)) return sel.length > 0
  return false
})

/** Concept currently displayed in the right-column slider on ceo-reselect concept route. */
const ceoReselectPreviewConceptFull = ref<Concept | null>(null)
const ceoReselectPreviewConceptLoading = ref(false)

async function loadCeoReselectPreviewConcept() {
  if (route.name !== 'ceo-reselect-concept') return

  const id = store.supervisorAlternativeDraft.conceptPreviewId
  if (!id) {
    ceoReselectPreviewConceptFull.value = null
    ceoReselectPreviewConceptLoading.value = false
    return
  }

  if (
    ceoReselectPreviewConceptFull.value &&
    ceoReselectPreviewConceptFull.value.id !== id
  ) {
    ceoReselectPreviewConceptFull.value = null
  }

  const fromList = concepts.value.find(c => c.id === id)
  if (fromList?.visual_url?.trim() || fromList?.gallery_url_1?.trim()) {
    ceoReselectPreviewConceptFull.value = fromList
    ceoReselectPreviewConceptLoading.value = false
    return
  }

  ceoReselectPreviewConceptLoading.value = true
  try {
    ceoReselectPreviewConceptFull.value = await apiGet<Concept>(`/api/concepts/${id}`)
  } catch {
    ceoReselectPreviewConceptFull.value = fromList ?? null
  } finally {
    ceoReselectPreviewConceptLoading.value = false
  }
}

/** Returns null until the Supervisor clicks a card — right panel stays empty on entry. */
const ceoReselectPreviewConcept = computed(() => ceoReselectPreviewConceptFull.value)

/** Confirmed Supervisor override concept (null = no override yet). */
const ceoReselectConfirmedConcept = computed(() => {
  const id = store.supervisorAlternativeDraft.conceptId
  if (!id) return null
  return concepts.value.find(c => c.id === id) ?? null
})

/**
 * Slider header badge on the Supervisor reselect concept route:
 * PO preview → «Вибір замовника»; CEO override → «Вибір СЕО».
 */
const ceoReselectSliderTopLabel = computed<string | null>(() => {
  const previewId = store.supervisorAlternativeDraft.conceptPreviewId
  if (!previewId) return null
  if (previewId === poConceptId.value) return 'Вибір замовника'
  return 'Вибір СЕО'
})

/**
 * Right-column loading flag for the CEO reselect concept route.
 * Only true while the concepts library is still loading — when no CEO concept
 * is selected yet, we deliberately show nothing (empty right panel) rather
 * than a skeleton or the PO pick.
 */
const ceoReselectRightPanelLoading = computed(
  () => librariesStore.isLoading || ceoReselectPreviewConceptLoading.value,
)

/**
 * Right-column loading flag for the CEO reselect *naming* sub-routes
 * (external / internal). Mirrors the concept-route logic: while libraries
 * are loading or the resolved mobile-preview concept hasn't materialized
 * yet, show a pixel-matched skeleton instead of `ConceptMobilePreview`'s
 * "Спочатку оберіть концепт" empty state to avoid a brief flash + CLS.
 */
const ceoReselectNamingRightPanelLoading = computed(
  () => librariesStore.isLoading || !ceoReselectMobilePreviewConcept.value
)

/**
 * Concept shown in the right-panel slider while PO edits concept (choice mode).
 * With a new concept on order (revision, brief-orders phase 4) the old pick is
 * still in the store until «Далі», yet it is no longer the brief's concept: the
 * slider shows the empty placeholder, as the draft screen does, until the
 * author browses one.
 */
const poEditPreviewConcept = computed(() => {
  const fallback =
    store.stepData.concept.newConceptBrief !== null ? null : store.stepData.concept.selectedId
  const id = store.stepData.concept.previewId ?? fallback
  if (!id) return null
  return concepts.value.find(c => c.id === id) ?? null
})

const poEditCeoConceptId = computed(() => {
  const sel = store.brandCeoSelections?.concept
  return typeof sel === 'string' ? sel : Array.isArray(sel) ? (sel[0] ?? null) : null
})

const poEditSliderTopLabel = computed<string | null>(() =>
  conceptEditSliderLabel({
    mode: route.meta.draftEdit ? 'draft' : 'revision',
    previewId: store.stepData.concept.previewId ?? null,
    selectedId: store.stepData.concept.selectedId ?? null,
    ceoConceptId: poEditCeoConceptId.value,
  }),
)

/** Mobile-preview concept for naming sub-pages: confirmed CEO if any, else PO. */
const ceoReselectMobilePreviewConcept = computed(() => {
  if (
    route.name === 'ceo-reselect-concept-external-naming' ||
    route.name === 'ceo-reselect-external-naming'
  ) {
    // If CEO already saved a concept override — show it in the preview.
    // Otherwise fall back to PO's concept (direct entry, no override yet).
    return ceoReselectConfirmedConcept.value ?? selectedConcept.value
  }
  return selectedConcept.value
})

/** Full concept record for PO edit naming steps (gallery_url_1 mobile preview). */
const poEditMobilePreviewConceptFull = ref<Concept | null>(null)

async function loadPoEditMobilePreviewConcept() {
  if (!isRevisionResponse.value) return
  // Concept-slider screens use ConceptPreviewSlider, not the mobile preview.
  if (route.name === 'po-edit-concept' || route.name === 'draft-edit-concept') return

  const id = store.stepData.concept.selectedId
  if (!id) {
    poEditMobilePreviewConceptFull.value = null
    return
  }

  // Drop stale value if it points to a different concept than the current selectedId.
  // Without this, `poEditMobilePreviewConcept ?? selectedConcept` keeps the previous
  // concept (it's not null) and causes a brief flash of the wrong preview on Next.
  if (poEditMobilePreviewConceptFull.value && poEditMobilePreviewConceptFull.value.id !== id) {
    poEditMobilePreviewConceptFull.value = null
  }

  const fromList = concepts.value.find(c => c.id === id)
  if (fromList?.gallery_url_1?.trim()) {
    poEditMobilePreviewConceptFull.value = fromList
    return
  }

  try {
    poEditMobilePreviewConceptFull.value = await apiGet<Concept>(`/api/concepts/${id}`)
  } catch {
    poEditMobilePreviewConceptFull.value = fromList ?? null
  }
}

const poEditMobilePreviewConcept = computed(
  () => poEditMobilePreviewConceptFull.value ?? selectedConcept.value,
)

/**
 * Right-column loading flag for PO edit *naming* sub-routes. Same rationale
 * as `ceoReselectNamingRightPanelLoading` — prevents the iPhone-preview
 * empty-state flash before libraries (and the optional gallery_url_1
 * concept fetch) resolve.
 */
const poEditNamingRightPanelLoading = computed(
  () =>
    librariesStore.isLoading ||
    // a new concept on order (phase 4) has nothing to load: no skeleton forever
    (!poEditMobilePreviewConcept.value && !hasOrderedNewConcept.value),
)

function confirmConceptFromSlider() {
  const id = store.stepData.concept.previewId ?? store.stepData.concept.selectedId
  if (!id) return
  store.setConcept({ selectedId: id, newConceptBrief: null })
}

function wizardRoute(step: number) {
  const editBrand =
    typeof route.query.editBrand === 'string' ? route.query.editBrand : null
  return wizardStepLocation(step, store.brandId, editBrand)
}

function goBack() {
  if (!isFirstStep.value) {
    let prev = currentStep.value - 1
    if (prev === 3 && store.shouldSkipStep3) prev = 2
    router.push(wizardRoute(prev))
  }
}

async function goNext() {
  if (isViewMode.value) return
  if (!store.isCurrentStepValid) return

  if (isLastStep.value) {
    const saved = await store.saveBrand()
    if (saved) {
      router.push('/constructor/success')
    }
    return
  }

  let next = currentStep.value + 1
  if (next === 3 && store.shouldSkipStep3) next = 4

  const routeStep = currentStep.value
  store.goToStep(next)
  const saved = await store.saveBrand()
  if (!saved) {
    store.goToStep(routeStep)
    return
  }

  router.push(wizardRoute(next))
}

function handleReturnToPreview() {
  const target = store.returnToStep
  store.setReturnToStep(null)
  if (target) {
    router.push(`/constructor/step/${target}`)
  }
}

/** Brand id when inline edit was opened from `/constructor/brand/:id` (`?editBrand=`). */
function resolveEditReturnBrandId(): string | undefined {
  const editBrand = route.query.editBrand
  if (typeof editBrand === 'string' && editBrand) return editBrand
  return store.brandId ?? undefined
}

/** Same return target as po-edit / ceo-reselect save handlers. */
function navigateAfterSectionEdit(fallbackStep: number) {
  const brandId = resolveEditReturnBrandId()
  if (brandId) {
    router.push({ name: 'brand-view-review', params: { id: brandId } })
    return
  }
  router.push(`/constructor/step/${fallbackStep}`)
}

/** PO inline section edit — persist then return to brand review (or wizard step 8). */
async function handleSaveSectionEdit() {
  const fallbackStep = store.returnToStep ?? 8
  const saved = await store.saveBrand()
  if (!saved) return
  store.commitEditSection()
  navigateAfterSectionEdit(fallbackStep)
}

/** PO inline section edit — revert snapshot and return to brand review. */
function handleCancelSectionEdit() {
  const fallbackStep = store.returnToStep ?? 8
  store.cancelEditSection()
  navigateAfterSectionEdit(fallbackStep)
}

function loadPreviewData() {
  const shouldLoad =
    isAlternativeSelection.value ||
    isRevisionResponse.value ||
    [2, 3, 4, 8].includes(currentStep.value)
  if (!shouldLoad) return
  librariesStore.load(store.brandId)
}

onMounted(() => {
  loadPreviewData()
  loadStep9Variants()
  if (route.name === 'ceo-reselect-concept') {
    void loadCeoReselectPreviewConcept()
  }
})
watch(currentStep, loadPreviewData)
watch(isAlternativeSelection, v => {
  if (v) {
    loadPreviewData()
    void loadCeoReselectPreviewConcept()
  }
})
watch(
  () =>
    [
      store.supervisorAlternativeDraft.conceptPreviewId,
      route.name,
      concepts.value.length,
    ] as const,
  () => {
    if (route.name === 'ceo-reselect-concept') void loadCeoReselectPreviewConcept()
  },
)
watch(isRevisionResponse, v => {
  if (v) {
    loadPreviewData()
    void loadPoEditMobilePreviewConcept()
  }
})
watch(
  () => [store.stepData.concept.selectedId, route.name] as const,
  () => {
    if (isRevisionResponse.value) void loadPoEditMobilePreviewConcept()
  },
)

const {
  loadVariants: loadStep9Variants,
  buildComposition,
  getOverlaySlice,
  hasSelections: hasStep9Selections,
} = useBrandPreviewLayers()

const step9SidebarVisible = ref(true)
const sidebarHiddenCalloutVisible = ref(false)
let sidebarHiddenCalloutTimer: ReturnType<typeof setTimeout> | null = null

const step7Composition = computed(() => buildComposition(false))
const step7OverlaySlice = computed(() => getOverlaySlice())

/**
 * **There is no `animate` argument any more — DP-15450 `visual components 2`.**
 * The Sidebar layer used to slide in from the bottom of the phone, and every
 * call here had to say whether this particular change should be animated. The
 * designer removed the animation («Прибрати анімацію появи Sidebar»), so the
 * layer simply is or is not there, and with it went the slice that had to
 * outlive its own selection long enough to slide back out.
 */
function setSidebarPreviewVisible(visible: boolean) {
  step9SidebarVisible.value = visible
}

function dismissSidebarHiddenCallout() {
  sidebarHiddenCalloutVisible.value = false
  if (sidebarHiddenCalloutTimer !== null) {
    clearTimeout(sidebarHiddenCalloutTimer)
    sidebarHiddenCalloutTimer = null
  }
}

function showSidebarHiddenCallout() {
  dismissSidebarHiddenCallout()
  sidebarHiddenCalloutVisible.value = true
  sidebarHiddenCalloutTimer = setTimeout(
    dismissSidebarHiddenCallout,
    SIDEBAR_HIDDEN_CALLOUT_DURATION_MS,
  )
}

function restoreSidebarPreview() {
  setSidebarPreviewVisible(true)
  dismissSidebarHiddenCallout()
}

function toggleSidebarPreview() {
  setSidebarPreviewVisible(!step9SidebarVisible.value)
  if (step9SidebarVisible.value) {
    dismissSidebarHiddenCallout()
  }
}

provide(VISUAL_COMPONENT_PREVIEW_KEY, {
  restoreSidebarPreview,
  sidebarVisible: step9SidebarVisible,
  toggleSidebarPreview,
})

onUnmounted(dismissSidebarHiddenCallout)

const prevSelections = ref<Record<string, string>>({})

watch(
  () => store.stepData?.visualComponents?.selections,
  newSel => {
    if (currentStep.value === 7) loadStep9Variants()

    const sel = (newSel ?? {}) as Record<string, string>
    const sidebarKey = Object.keys(sel).find(k => k.includes('sidebar'))
    const prevSidebarKey = Object.keys(prevSelections.value).find(k => k.includes('sidebar'))

    // Sidebar deselected: there is no layer left to draw, so the only thing
    // to settle is what the NEXT pick should find — and that is "shown".
    if (prevSidebarKey && !sidebarKey) {
      setSidebarPreviewVisible(true)
    }

    const sidebarChanged = sidebarKey && sel[sidebarKey] !== prevSelections.value[sidebarKey ?? '']
    const nonSidebarChanged =
      Object.keys(sel).some(k => !k.includes('sidebar') && sel[k] !== prevSelections.value[k]) ||
      Object.keys(prevSelections.value).some(
        k => !k.includes('sidebar') && prevSelections.value[k] !== sel[k]
      )

    if (sidebarChanged) {
      setSidebarPreviewVisible(true)
      dismissSidebarHiddenCallout()
    } else if (nonSidebarChanged) {
      const sidebarStillSelected = Boolean(sidebarKey && sel[sidebarKey])
      const wasSidebarVisible = step9SidebarVisible.value
      if (sidebarStillSelected) {
        setSidebarPreviewVisible(false)
        if (wasSidebarVisible && currentStep.value === 7) {
          window.setTimeout(showSidebarHiddenCallout, 100)
        }
      }
    }

    prevSelections.value = { ...sel }
  },
  { deep: true }
)

watch(currentStep, step => {
  if (step !== 7) {
    dismissSidebarHiddenCallout()
  }
  if (step === 7) loadStep9Variants()
  if (step === 8) loadStep9Variants()
})
</script>

<template>
  <SupervisorBriefGateView v-if="isSupervisorAwaitingTeam" />
  <div
    v-else
    class="constructor-layout h-[100dvh] bg-background flex overflow-hidden"
    :class="embedded ? '' : 'items-center justify-center'"
  >
    <ConstructorDualPaneShell
      :layout-mode="layoutMode"
      :full-width="shellFullWidth"
      :show-right="showRightPane"
      :scale="shellScale"
      :embed="embedded"
      :review-shell="isReviewShell"
      :wizard-step="currentStep"
    >
      <template #header>
        <UiWizardHeader
          :title="wizardHeaderTitle"
          :current-step="wizardHeaderStep"
          :total-steps="wizardHeaderTotal"
          @close="handleWizardClose"
        />
      </template>

      <template #left-header>
        <UiStepHeader
          v-if="!isReviewShell"
          :class="currentStep === 8 ? 'shrink-0' : ''"
          class="constructor-layout__step-header mb-6"
          :title="stepTitle"
          :description="stepSubtitle"
        />
      </template>

      <RouterView />

      <template #left-footer>
        <template v-if="!isViewMode && !isReviewShell">
          <UiFooter
            v-if="store.editingSection"
            class="constructor-layout__wizard-footer"
            cancel-label="Скасувати"
            primary-label="Зберегти"
            :primary-disabled="!store.isCurrentStepValid"
            :loading="store.isSaving"
            @cancel="handleCancelSectionEdit"
            @primary="handleSaveSectionEdit"
          >
            <template #note>
              <p v-if="store.saveError" class="text-sm text-red-600">
                {{ store.saveError }}
              </p>
            </template>
          </UiFooter>

          <UiFooter
            v-else-if="store.returnToStep"
            class="constructor-layout__wizard-footer"
            :show-cancel="false"
            primary-label="Повернутись"
            @primary="handleReturnToPreview"
          >
            <template #primary-icon="{ iconClass }">
              <CornerUpLeftIcon :class="iconClass" />
            </template>
          </UiFooter>

          <UiFooter
            v-else
            class="constructor-layout__wizard-footer"
            :show-cancel="!isFirstStep"
            cancel-label="Назад"
            :show-primary="!isLastStep"
            primary-label="Далі"
            :primary-disabled="!store.isCurrentStepValid"
            @cancel="goBack"
            @primary="goNext"
          >
            <template #note>
              <p v-if="store.saveError" class="text-sm text-red-600">
                {{ store.saveError }}
              </p>
            </template>
          </UiFooter>
        </template>
      </template>

      <template #right>
        <BrandPreviewPanel
          v-if="layoutMode === 'review'"
        />

        <template v-else-if="isRevisionResponse">
          <ConceptPreviewSlider
            v-if="(route.name === 'po-edit-concept' || route.name === 'draft-edit-concept') && route.query.mode !== 'post-apply'"
            :concept="poEditPreviewConcept"
            :top-label="poEditSliderTopLabel"
          />
          <template v-else>
            <ConceptMobilePreviewSkeleton v-if="poEditNamingRightPanelLoading" />
            <ConceptMobilePreview v-else :concept="poEditMobilePreviewConcept" />
          </template>
        </template>

        <template v-else-if="isAlternativeSelection">
          <template v-if="route.name === 'ceo-reselect-concept'">
            <ConceptPreviewSliderSkeleton
              v-if="ceoReselectRightPanelLoading && hasCeoSavedConceptOverride"
            />
            <ConceptPreviewEmptySkeleton v-else-if="ceoReselectRightPanelLoading" />

            <ConceptPreviewSlider
              v-else-if="ceoReselectPreviewConcept"
              :concept="ceoReselectPreviewConcept"
              :top-label="ceoReselectSliderTopLabel"
            />

            <!-- CEO reselect with nothing picked yet is the kit's
                 `Type=Placeholder` `4492:11680`, which is exactly what the
                 slider draws with no concept. It used to be a second hand-made
                 copy of that box, and it had drifted on five counts: a dashed
                 `rgba(0,0,0,0.1)` frame, `#c8c8c8`, `#717182`, a 24 gap where
                 the kit has 16, and the FILLED placeholder glyph, which the kit
                 does not carry at any size (divergences row 41). -->
            <ConceptPreviewSlider
              v-else
              class="constructor-layout__ceo-reselect-empty"
              :concept="null"
            />
          </template>
          <template v-else>
            <ConceptMobilePreviewSkeleton v-if="ceoReselectNamingRightPanelLoading" />
            <ConceptMobilePreview v-else :concept="ceoReselectMobilePreviewConcept" />
          </template>
        </template>

        <StepPreviewRightPanel
          v-else-if="!isFullWidth"
          :current-step="currentStep"
          :brand-basics="brandBasics"
          :concept-preview-for-slider="conceptPreviewForSlider"
          :is-concept-slider-final-selected="isConceptSliderFinalSelected"
          :selected-concept="selectedConcept"
          :step7-composition="step7Composition"
          :step7-overlay-slice="step7OverlaySlice"
          :has-step9-selections="hasStep9Selections"
          :step9-sidebar-visible="step9SidebarVisible"
          :sidebar-hidden-callout-visible="sidebarHiddenCalloutVisible"
          :delegate-to-designers="store.stepData.visualComponents.delegateToDesigners"
          :libraries-loading="librariesStore.isLoading"
          :has-stored-concept-selection="step2HasStoredConceptSelection"
          :has-ordered-new-concept="hasOrderedNewConcept"
          @confirm-concept="confirmConceptFromSlider"
        />
      </template>

      <!-- Both at the shell ROOT, and that is the owner's call: the concept
           preview is a DRAWER — it slides in from the right edge of the window
           and takes the full height of it, at every width. Mounted inside the
           row it became a card floating inside the 1700 frame on a 2560 screen,
           which reads as a modal, and a modal is not what this is. -->
      <template #overlays>
        <LayoutPreviewOverlays />
        <ConceptGalleryDrawer />
        <ConfirmationModal
          v-if="exitConfirm.open.value"
          :title="BRIEF_EXIT_CONFIRM_COPY.title"
          :body="exitConfirmBody"
          :cancel-label="BRIEF_EXIT_CONFIRM_COPY.cancelLabel"
          :primary-label="BRIEF_EXIT_CONFIRM_COPY.primaryLabel"
          :primary-loading="exitConfirm.leaving.value"
          @cancel="exitConfirm.stay"
          @primary="exitConfirm.confirmExit"
        />
        <UiModal
          v-if="changedElsewhereCopy"
          :title="changedElsewhereCopy.title"
          size="sm"
          :close-on-backdrop="false"
          @close="reloadChangedBrief"
        >
          <div class="flex flex-col gap-6">
            <p class="whitespace-pre-line text-base font-normal text-ink-700">
              {{ changedElsewhereCopy.body }}
            </p>
            <UiButton size="L" variant="primary" block @click="reloadChangedBrief">
              {{ changedElsewhereCopy.primaryLabel }}
            </UiButton>
          </div>
        </UiModal>
      </template>
    </ConstructorDualPaneShell>
  </div>
</template>
