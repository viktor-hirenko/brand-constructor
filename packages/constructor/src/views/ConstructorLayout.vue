<script setup lang="ts">
import { computed, watch, ref, onMounted } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { useConstructorStore } from '@/stores/constructor'
import { useAuthStore } from '@/stores/auth'
import { apiGet } from '@/composables/useApi'
import { useLibrariesStore } from '@/stores/libraries'
import { useBrandPreviewLayers } from '@/composables/useBrandPreviewLayers'
import { useViewportScale } from '@/composables/useViewportScale'
import ConceptPreviewSlider from '@/components/constructor/preview/ConceptPreviewSlider.vue'
import ConceptPreviewSliderSkeleton from '@/components/constructor/skeletons/ConceptPreviewSliderSkeleton.vue'
import ConceptMobilePreview from '@/components/constructor/preview/ConceptMobilePreview.vue'
import ConceptMobilePreviewSkeleton from '@/components/constructor/skeletons/ConceptMobilePreviewSkeleton.vue'
import BrandPreviewPanel from '@/components/constructor/preview/BrandPreviewPanel.vue'
import StepPreviewRightPanel from '@/components/constructor/layout/StepPreviewRightPanel.vue'
import LayoutPreviewOverlays from '@/components/constructor/layout/LayoutPreviewOverlays.vue'
import CornerUpLeftIcon from '@/components/icons/CornerUpLeftIcon.vue'
import ImagePlaceholderFilledIcon from '@/components/icons/ImagePlaceholderFilledIcon.vue'
import ConceptPreviewEmptySkeleton from '@/components/constructor/skeletons/ConceptPreviewEmptySkeleton.vue'
import type { Concept } from '@brand-constructor/shared/types'

const route = useRoute()
const router = useRouter()
const store = useConstructorStore()
const authStore = useAuthStore()
const librariesStore = useLibrariesStore()

/**
 * Fits the fixed 1311×810 shell into the current viewport via CSS scale so
 * every internal pixel value stays 1:1 with the Figma source. Padding 48 ≈
 * outer wrapper p-6 (24px on each side).
 */
const { scale: shellScale } = useViewportScale({
  baseWidth: 1311,
  baseHeight: 810,
  padding: 48,
})

/**
 * True when CEO/admin is reviewing a submitted brand (or one already returned)
 * on the final step — drives the "no header / no footer / brand preview panel"
 * layout that matches Figma 1473:23546.
 */
const isCeoReselect = computed(() => route.meta.ceoReselect === true)
const isPoEdit = computed(() => route.meta.poEdit === true)

const isCeoFinalize = computed(() => {
  if (route.meta.ceoReselect) return false
  if ((route.meta.step as number | undefined) !== 8) return false
  if (!authStore.isCeo) return false
  const status = store.brandStatus
  return status === 'submitted' || status === 'needs_revision'
})

/**
 * Final step in draft OR submitted — same shell as CEO finalize (Figma Product view).
 * Applies to ANY brief creator (PO/Admin/HeadDHC/CPO_CEO per PRD §4): the wizard's
 * own author always sees the unified review layout on step 8, never the legacy
 * wizard-shell. CEO/Admin reviewing someone else's submitted/needs_revision brief
 * is handled by `isCeoFinalize` (split by status, not by role).
 */
const isPoDraftReview = computed(() => {
  if (route.meta.ceoReselect) return false
  if (route.meta.poEdit) return false
  if ((route.meta.step as number | undefined) !== 8) return false
  return store.brandStatus === 'draft' || store.brandStatus === 'submitted'
})

/**
 * Approved brief — read-only review (any role: PO, CEO/admin, external teams).
 * Uses the same Figma "Product view" shell as PO draft / CEO finalize:
 * no wizard header, no wizard footer, BrandPreviewPanel on the right.
 */
const isApprovedReview = computed(() => {
  if (route.meta.ceoReselect) return false
  if (route.meta.poEdit) return false
  if ((route.meta.step as number | undefined) !== 8) return false
  return store.brandStatus === 'approved'
})

/**
 * PO viewing a brief returned from CEO (`needs_revision`).
 * Uses the same shell as CEO finalize / PO draft review — no wizard header,
 * no wizard footer, BrandPreviewPanel on the right (Figma 1958:3720).
 *
 * NOTE: PO edit routes (`route.meta.poEdit`) also live on step 8 with
 * status `needs_revision`, but they must NOT be treated as returned-review —
 * they have their own header/footer/right panel (ConceptPreviewSlider, etc.).
 */
const isPoReturnedReview = computed(() => {
  if (route.meta.ceoReselect) return false
  if (route.meta.poEdit) return false
  if ((route.meta.step as number | undefined) !== 8) return false
  if (authStore.isCeo) return false
  return store.brandStatus === 'needs_revision'
})

/** Aggregate flag — any review-shell layout (no wizard header/footer). */
const isReviewShell = computed(
  () =>
    isCeoFinalize.value ||
    isCeoReselect.value ||
    isPoEdit.value ||
    isPoDraftReview.value ||
    isPoReturnedReview.value ||
    isApprovedReview.value
)

const currentStep = computed(() => (route.meta.step as number) || 1)

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

const stepTitle = computed(() => {
  if (currentStep.value === 8 && store.brandInternalName) {
    return store.brandInternalName
  }
  return (route.meta.title as string) || ''
})
const stepSubtitle = computed(() => (route.meta.subtitle as string) || '')
const totalSteps = 8
const progressPercent = computed(() => Math.round((currentStep.value / totalSteps) * 100))

const isFirstStep = computed(() => currentStep.value === 1)
const isLastStep = computed(() => currentStep.value === totalSteps)
const isFullWidth = computed(() => [5, 6].includes(currentStep.value))
const isViewMode = computed(() => route.path.startsWith('/constructor/brand/'))

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

/** Concept currently displayed in the right-column slider.
 *  Returns null until CEO clicks a card — right panel stays empty on entry. */
const ceoReselectPreviewConcept = computed(() => {
  const id = store.ceoReselectDraft.conceptPreviewId
  if (!id) return null
  return concepts.value.find(c => c.id === id) ?? null
})

/** Confirmed CEO override concept (null = no CEO override yet). */
const ceoReselectConfirmedConcept = computed(() => {
  const id = store.ceoReselectDraft.conceptId
  if (!id) return null
  return concepts.value.find(c => c.id === id) ?? null
})

/**
 * Slider header badge on the CEO reselect concept route:
 * always "Вибір СЕО" — the slider is only shown after CEO has clicked a card,
 * so by definition the choice belongs to CEO. Naming sub-routes use
 * ConceptMobilePreview whose heading is already "Обраний концепт".
 */
const ceoReselectSliderTopLabel = computed<string | null>(() =>
  store.ceoReselectDraft.conceptPreviewId ? 'Вибір СЕО' : null
)

/**
 * Right-column loading flag for the CEO reselect concept route.
 * Only true while the concepts library is still loading — when no CEO concept
 * is selected yet, we deliberately show nothing (empty right panel) rather
 * than a skeleton or the PO pick.
 */
const ceoReselectRightPanelLoading = computed(() => librariesStore.isLoading)

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

/** Concept shown in the right-panel slider while PO edits concept (choice mode). */
const poEditPreviewConcept = computed(() => {
  const id = store.stepData.concept.previewId ?? store.stepData.concept.selectedId
  if (!id) return null
  return concepts.value.find(c => c.id === id) ?? null
})

const poEditCeoConceptId = computed(() => {
  const sel = store.brandCeoSelections?.concept
  return typeof sel === 'string' ? sel : Array.isArray(sel) ? (sel[0] ?? null) : null
})

const poEditSliderTopLabel = computed<string | null>(() => {
  const previewId = store.stepData.concept.previewId
  if (!previewId) return null
  if (previewId === poEditCeoConceptId.value) return 'Вибір CEO'
  if (previewId === store.stepData.concept.selectedId) return 'Ваш попередній вибір'
  return null
})

/** Mobile-preview concept for naming sub-pages: confirmed CEO if any, else PO. */
const ceoReselectMobilePreviewConcept = computed(() => {
  if (route.name === 'ceo-reselect-concept-external-naming') {
    return ceoReselectConfirmedConcept.value ?? selectedConcept.value
  }
  return selectedConcept.value
})

/** Full concept record for PO edit naming steps (gallery_url_1 mobile preview). */
const poEditMobilePreviewConceptFull = ref<Concept | null>(null)

async function loadPoEditMobilePreviewConcept() {
  if (!isPoEdit.value) return
  if (route.name === 'po-edit-concept') return

  const id = store.stepData.concept.selectedId
  if (!id) {
    poEditMobilePreviewConceptFull.value = null
    return
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
  () => librariesStore.isLoading || !poEditMobilePreviewConcept.value,
)

function confirmConceptFromSlider() {
  const id = store.stepData.concept.previewId ?? store.stepData.concept.selectedId
  if (!id) return
  store.setConcept({ selectedId: id, newConceptBrief: null })
}

function goBack() {
  if (!isFirstStep.value) {
    let prev = currentStep.value - 1
    if (prev === 3 && store.shouldSkipStep3) prev = 2
    router.push(`/constructor/step/${prev}`)
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
  router.push(`/constructor/step/${next}`)
}

function handleReturnToPreview() {
  const target = store.returnToStep
  store.setReturnToStep(null)
  if (target) {
    router.push(`/constructor/step/${target}`)
  }
}

/** PO edit-mode — save current state and come back to Final review. */
function handleSaveSectionEdit() {
  const target = store.returnToStep ?? 9
  store.commitEditSection()
  router.push(`/constructor/step/${target}`)
}

/** PO edit-mode — revert changes and come back to Final review. */
function handleCancelSectionEdit() {
  const target = store.returnToStep ?? 9
  store.cancelEditSection()
  router.push(`/constructor/step/${target}`)
}

function loadPreviewData() {
  const shouldLoad =
    isCeoReselect.value || isPoEdit.value || [2, 3, 4, 8].includes(currentStep.value)
  if (!shouldLoad) return
  librariesStore.load(store.brandId)
}

onMounted(() => {
  loadPreviewData()
  loadStep9Variants()
})
watch(currentStep, loadPreviewData)
watch(isCeoReselect, v => {
  if (v) loadPreviewData()
})
watch(isPoEdit, v => {
  if (v) {
    loadPreviewData()
    void loadPoEditMobilePreviewConcept()
  }
})
watch(
  () => [store.stepData.concept.selectedId, route.name] as const,
  () => {
    if (isPoEdit.value) void loadPoEditMobilePreviewConcept()
  },
)

const {
  loadVariants: loadStep9Variants,
  buildLayers,
  hasSelections: hasStep9Selections,
  hasSidebarSelected,
} = useBrandPreviewLayers()

const step9SidebarVisible = ref(true)

const step9SelectedLayers = computed(() => buildLayers(!step9SidebarVisible.value))

function toggleSidebarPreview() {
  step9SidebarVisible.value = !step9SidebarVisible.value
}

const prevSelections = ref<Record<string, string>>({})

watch(
  () => store.stepData?.visualComponents?.selections,
  newSel => {
    if (currentStep.value === 7) loadStep9Variants()

    const sel = (newSel ?? {}) as Record<string, string>
    const sidebarKey = Object.keys(sel).find(k => k.includes('sidebar'))
    const prevSidebarKey = Object.keys(prevSelections.value).find(k => k.includes('sidebar'))

    const sidebarChanged = sidebarKey && sel[sidebarKey] !== prevSelections.value[sidebarKey ?? '']
    const nonSidebarChanged =
      Object.keys(sel).some(k => !k.includes('sidebar') && sel[k] !== prevSelections.value[k]) ||
      Object.keys(prevSelections.value).some(
        k => !k.includes('sidebar') && prevSelections.value[k] !== sel[k]
      )

    if (sidebarChanged) {
      step9SidebarVisible.value = true
    } else if (nonSidebarChanged) {
      step9SidebarVisible.value = false
    }

    prevSelections.value = { ...sel }
  },
  { deep: true }
)

watch(currentStep, step => {
  if (step === 7) loadStep9Variants()
  if (step === 8) loadStep9Variants()
})
</script>

<template>
  <div class="constructor-layout h-[100dvh] bg-background flex items-center justify-center overflow-hidden">
    <div
      class="constructor-layout__shell relative shrink-0 w-[1311px] h-[810px] bg-card rounded-[14px] shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)] overflow-hidden flex"
      :style="{ transform: `scale(${shellScale})`, transformOrigin: 'center center' }"
    >
      <!-- Main Panel (full-width on step 3, 42% otherwise) -->
      <div
        :class="[
          'constructor-layout__main-panel flex flex-col min-h-0',
          isFullWidth && !isCeoReselect && !isPoEdit ? 'w-full' : 'w-[42%]',
          isReviewShell ? 'bg-[#f9f9fb]' : 'bg-muted/30',
        ]"
      >
        <div
          class="constructor-layout__main-content min-h-0 flex-1"
          :class="[
            isReviewShell ? 'flex flex-col overflow-hidden' : 'px-12 pt-5 pb-6',
            isCeoReselect || isPoEdit ? 'px-8 pt-8 pb-0' : '',
            !isReviewShell && currentStep === 8 ? 'flex flex-col overflow-hidden' : '',
            !isReviewShell && currentStep !== 8 ? 'overflow-y-auto' : '',
          ]"
        >
          <div v-if="!isReviewShell" :class="currentStep === 8 ? 'shrink-0' : ''" class="constructor-layout__wizard-header">
            <h1 class="constructor-layout__wizard-title text-2xl font-medium text-foreground tracking-[0.07px] mb-2">
              {{ stepTitle }}
            </h1>
            <p class="constructor-layout__wizard-subtitle text-base text-muted-foreground tracking-[-0.31px] mb-6">
              {{ stepSubtitle }}
            </p>

            <div class="constructor-layout__wizard-progress mb-8">
              <div class="constructor-layout__wizard-progress-label mb-2">
                <span class="text-sm text-muted-foreground tracking-[-0.15px]">
                  Крок {{ currentStep }} з {{ totalSteps }}
                </span>
              </div>
              <div class="constructor-layout__wizard-progress-track h-2 bg-muted rounded-full overflow-hidden">
                <div
                  class="constructor-layout__wizard-progress-bar h-full bg-primary rounded-full transition-all duration-300"
                  :style="{ width: `${progressPercent}%` }"
                />
              </div>
            </div>
          </div>

          <div
            class="constructor-layout__router-view"
            :class="
              isReviewShell || currentStep === 8
                ? 'flex-1 min-h-0 flex flex-col overflow-hidden'
                : ''
            "
          >
            <RouterView />
          </div>
        </div>

        <div
          v-if="!isViewMode && !isReviewShell"
          class="constructor-layout__wizard-footer shrink-0 px-12 py-6 border-t border-border"
        >
          <div v-if="store.editingSection" class="constructor-layout__footer-actions flex items-center gap-3">
            <button
              class="constructor-layout__footer-button constructor-layout__footer-button--secondary h-[50px] px-6 border border-black/10 text-foreground rounded-[10px] hover:bg-black/[0.02] transition-all text-base font-medium"
              @click="handleCancelSectionEdit"
            >
              Скасувати
            </button>
            <button
              :disabled="!store.isCurrentStepValid"
              class="constructor-layout__footer-button constructor-layout__footer-button--primary h-[50px] px-6 bg-primary text-primary-foreground rounded-[10px] disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-all text-base font-medium"
              @click="handleSaveSectionEdit"
            >
              Зберегти
            </button>
          </div>

          <div v-else-if="store.returnToStep" class="constructor-layout__footer-actions flex items-center gap-3">
            <button
              class="constructor-layout__footer-button constructor-layout__footer-button--primary h-[50px] px-6 bg-[#030213] text-white rounded-[10px] hover:opacity-90 transition-all text-base font-medium flex items-center gap-2"
              @click="handleReturnToPreview"
            >
              <CornerUpLeftIcon class="size-4" />
              Повернутись
            </button>
          </div>

          <div v-else class="constructor-layout__footer-actions flex items-center gap-3">
            <button
              v-if="!isFirstStep"
              class="constructor-layout__footer-button constructor-layout__footer-button--secondary h-[50px] px-6 border border-black/10 text-foreground rounded-[10px] hover:bg-black/[0.02] transition-all text-base font-medium"
              @click="goBack"
            >
              Назад
            </button>
            <button
              v-if="!isLastStep"
              :disabled="!store.isCurrentStepValid"
              class="constructor-layout__footer-button constructor-layout__footer-button--primary h-[50px] px-6 bg-primary text-primary-foreground rounded-[10px] disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-all text-base font-medium"
              @click="goNext"
            >
              Далі
            </button>
          </div>
        </div>
      </div>

      <!--
        Right Panel: CEO finalize / PO draft / PO returned / approved read-only preview.
        Step 8 preview lives here only (BrandPreviewPanel + ReviewSubmitView).
        Legacy 1-phone + summary-card layout was removed from StepPreviewRightPanel —
        do not re-add a step-8 branch there.
      -->
      <div
        v-if="isCeoFinalize || isPoDraftReview || isPoReturnedReview || isApprovedReview"
        class="constructor-layout__right-panel constructor-layout__right-panel--preview w-[58%] bg-white min-h-0 flex flex-col overflow-hidden"
      >
        <BrandPreviewPanel />
      </div>

      <!-- Right Panel: PO edit — concept choice uses ConceptPreviewSlider;
           external/internal naming sub-routes use ConceptMobilePreview (same as CEO reselect) -->
      <div
        v-else-if="isPoEdit"
        class="constructor-layout__right-panel constructor-layout__right-panel--po-edit relative w-[58%] bg-white overflow-y-auto min-h-0 pt-[20px] pb-[100px] px-12"
      >
        <ConceptPreviewSlider
          v-if="route.name === 'po-edit-concept' && route.query.mode !== 'post-apply'"
          :concept="poEditPreviewConcept"
          :is-final-selected="false"
          :top-label="poEditSliderTopLabel"
          hide-primary-action
        />
        <template v-else>
          <ConceptMobilePreviewSkeleton v-if="poEditNamingRightPanelLoading" />
          <ConceptMobilePreview v-else :concept="poEditMobilePreviewConcept" />
        </template>
      </div>

      <!-- Right Panel: CEO re-select preview -->
      <div
        v-else-if="isCeoReselect"
        class="constructor-layout__right-panel constructor-layout__right-panel--ceo-reselect relative w-[58%] bg-white overflow-y-auto min-h-0 pt-[20px] pb-[100px] px-12"
      >
        <template v-if="route.name === 'ceo-reselect-concept'">
          <!-- Skeleton: shape matches what will appear after loading to prevent CLS.
               CEO with a saved override → slider skeleton; without → empty-state skeleton. -->
          <ConceptPreviewSliderSkeleton v-if="ceoReselectRightPanelLoading && hasCeoSavedConceptOverride" />
          <ConceptPreviewEmptySkeleton v-else-if="ceoReselectRightPanelLoading" />

          <!-- Slider: CEO has clicked a card or has a saved override. -->
          <ConceptPreviewSlider
            v-else-if="ceoReselectPreviewConcept"
            :concept="ceoReselectPreviewConcept"
            :is-final-selected="false"
            :top-label="ceoReselectSliderTopLabel"
            hide-primary-action
          />

          <!-- Empty-state: Figma 2201:12563. Header-area spacer keeps the card
               visually aligned with the slider canvas position. -->
          <div v-else class="constructor-layout__ceo-reselect-empty flex flex-col h-full">
            <div class="shrink-0 h-[56px]" aria-hidden="true" />
            <div
              class="flex-1 bg-[#f9f9fb] border border-dashed border-[rgba(0,0,0,0.1)] rounded-[24px] flex flex-col items-center justify-center gap-6"
            >
              <ImagePlaceholderFilledIcon class="size-10 text-[#c8c8c8]" />
              <p class="text-[16px] leading-6 tracking-[-0.3125px] text-[#717182] text-center w-[200px]">
                Оберіть концепт зліва, щоб переглянути прев'ю.
              </p>
            </div>
          </div>
        </template>
        <template v-else>
          <ConceptMobilePreviewSkeleton v-if="ceoReselectNamingRightPanelLoading" />
          <ConceptMobilePreview v-else :concept="ceoReselectMobilePreviewConcept" />
        </template>
      </div>

      <!-- Right Panel: Step 1/2/3/4/7 previews (hidden on full-width steps and on step 8) -->
      <StepPreviewRightPanel
        v-else-if="!isFullWidth"
        :current-step="currentStep"
        :brand-basics="brandBasics"
        :concept-preview-for-slider="conceptPreviewForSlider"
        :is-concept-slider-final-selected="isConceptSliderFinalSelected"
        :selected-concept="selectedConcept"
        :step9-selected-layers="step9SelectedLayers"
        :has-step9-selections="hasStep9Selections"
        :has-sidebar-selected="hasSidebarSelected"
        :step9-sidebar-visible="step9SidebarVisible"
        :delegate-to-designers="store.stepData.visualComponents.delegateToDesigners"
        @confirm-concept="confirmConceptFromSlider"
        @toggle-sidebar="toggleSidebarPreview"
      />

      <LayoutPreviewOverlays />
    </div>
  </div>
</template>
