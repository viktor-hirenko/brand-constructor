<script setup lang="ts">
import { computed, watch, ref, onMounted } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { useConstructorStore } from '@/stores/constructor'
import { useAuthStore } from '@/stores/auth'
import { apiGet } from '@/composables/useApi'
import { useLibrariesStore } from '@/stores/libraries'
import { useBrandPreviewLayers } from '@/composables/useBrandPreviewLayers'
import {
  DESIGN_SHELL_HEIGHT,
  DESIGN_SHELL_MIN_VIEWPORT_WIDTH,
  DESIGN_SHELL_WIDTH,
} from '@/constants/layoutShell'
import {
  BRIEF_BTN_PRIMARY,
  BRIEF_BTN_SECONDARY,
  BRIEF_BTN_PRIMARY_DARK,
  BRIEF_FOOTER_BAR,
  BRIEF_FOOTER_ACTIONS,
} from '@/constants/brandBriefShellTokens'
import { useViewportScale } from '@/composables/useViewportScale'
import { useBrandBriefReviewPhase, BRAND_BRIEF_REVIEW_PHASE } from '@/composables/useBrandBriefReviewPhase'
import ConceptPreviewSlider from '@/components/constructor/preview/ConceptPreviewSlider.vue'
import ConceptPreviewSliderSkeleton from '@/components/constructor/skeletons/ConceptPreviewSliderSkeleton.vue'
import ConceptMobilePreview from '@/components/constructor/preview/ConceptMobilePreview.vue'
import ConceptMobilePreviewSkeleton from '@/components/constructor/skeletons/ConceptMobilePreviewSkeleton.vue'
import BrandPreviewPanel from '@/components/constructor/preview/BrandPreviewPanel.vue'
import ConstructorDualPaneShell from '@/components/constructor/layout/ConstructorDualPaneShell.vue'
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

const { scale: shellScale } = useViewportScale({
  baseWidth: DESIGN_SHELL_WIDTH,
  baseHeight: DESIGN_SHELL_HEIGHT,
  minViewportWidth: DESIGN_SHELL_MIN_VIEWPORT_WIDTH,
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
  isAuthorReturned,
  isApprovedPhase,
  isReviewShell,
  layoutMode,
} = useBrandBriefReviewPhase()

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
  if (route.name === 'po-edit-concept') return

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
})
watch(currentStep, loadPreviewData)
watch(isAlternativeSelection, v => {
  if (v) loadPreviewData()
})
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
    <ConstructorDualPaneShell
      :layout-mode="layoutMode"
      :full-width="shellFullWidth"
      :show-right="showRightPane"
      :scale="shellScale"
      :review-shell="isReviewShell"
      :wizard-step="currentStep"
    >
      <template #left-header>
        <div
          v-if="!isReviewShell"
          :class="currentStep === 8 ? 'shrink-0' : ''"
          class="constructor-layout__wizard-header"
        >
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
      </template>

      <RouterView />

      <template #left-footer>
        <div
          v-if="!isViewMode && !isReviewShell"
          class="constructor-layout__wizard-footer"
          :class="BRIEF_FOOTER_BAR"
        >
          <div v-if="store.editingSection" class="constructor-layout__footer-actions flex flex-col gap-2">
            <div :class="BRIEF_FOOTER_ACTIONS">
              <button
                :class="BRIEF_BTN_SECONDARY"
                class="constructor-layout__footer-button constructor-layout__footer-button--secondary disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="store.isSaving"
                @click="handleCancelSectionEdit"
              >
                Скасувати
              </button>
              <button
                :disabled="!store.isCurrentStepValid || store.isSaving"
                :class="BRIEF_BTN_PRIMARY"
                class="constructor-layout__footer-button constructor-layout__footer-button--primary"
                @click="handleSaveSectionEdit"
              >
                {{ store.isSaving ? 'Збереження…' : 'Зберегти' }}
              </button>
            </div>
            <p v-if="store.saveError" class="text-sm text-red-600">
              {{ store.saveError }}
            </p>
          </div>

          <div v-else-if="store.returnToStep" :class="BRIEF_FOOTER_ACTIONS" class="constructor-layout__footer-actions">
            <button
              :class="BRIEF_BTN_PRIMARY_DARK"
              class="constructor-layout__footer-button constructor-layout__footer-button--primary"
              @click="handleReturnToPreview"
            >
              <CornerUpLeftIcon class="size-4" />
              Повернутись
            </button>
          </div>

          <div v-else :class="BRIEF_FOOTER_ACTIONS" class="constructor-layout__footer-actions">
            <button
              v-if="!isFirstStep"
              :class="BRIEF_BTN_SECONDARY"
              class="constructor-layout__footer-button constructor-layout__footer-button--secondary"
              @click="goBack"
            >
              Назад
            </button>
            <button
              v-if="!isLastStep"
              :disabled="!store.isCurrentStepValid"
              :class="BRIEF_BTN_PRIMARY"
              class="constructor-layout__footer-button constructor-layout__footer-button--primary"
              @click="goNext"
            >
              Далі
            </button>
          </div>
        </div>
      </template>

      <template #right>
        <BrandPreviewPanel
          v-if="layoutMode === 'review'"
        />

        <template v-else-if="isRevisionResponse">
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
              :is-final-selected="false"
              :top-label="ceoReselectSliderTopLabel"
              hide-primary-action
            />

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
        </template>

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
          :libraries-loading="librariesStore.isLoading"
          :has-stored-concept-selection="step2HasStoredConceptSelection"
          @confirm-concept="confirmConceptFromSlider"
          @toggle-sidebar="toggleSidebarPreview"
        />
      </template>

      <template #overlays>
        <LayoutPreviewOverlays />
      </template>
    </ConstructorDualPaneShell>
  </div>
</template>
