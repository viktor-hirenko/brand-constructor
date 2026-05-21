<script setup lang="ts">
import { computed, watch, ref, onMounted } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { useConstructorStore } from '@/stores/constructor'
import { useAuthStore } from '@/stores/auth'
import { apiGet } from '@/composables/useApi'
import { useLibrariesStore } from '@/stores/libraries'
import { useBrandPreviewLayers } from '@/composables/useBrandPreviewLayers'
import { useViewportScale } from '@/composables/useViewportScale'
import { logSilent } from '@/utils/log'
import ConceptDetailOverlay from '@/components/constructor/preview/ConceptDetailOverlay.vue'
import ConceptPreviewSlider from '@/components/constructor/preview/ConceptPreviewSlider.vue'
import ConceptMobilePreview from '@/components/constructor/preview/ConceptMobilePreview.vue'
import BrandPreviewPanel from '@/components/constructor/preview/BrandPreviewPanel.vue'
import StepPreviewRightPanel from '@/components/constructor/layout/StepPreviewRightPanel.vue'
import LayoutPreviewOverlays from '@/components/constructor/layout/LayoutPreviewOverlays.vue'
import type { Concept, ExternalNaming } from '@brand-constructor/shared/types'

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
  if (!authStore.isCeoOrAdmin) return false
  const status = store.brandStatus
  return status === 'submitted' || status === 'needs_revision'
})

/** PO on final step in draft OR submitted — same shell as CEO finalize (Figma Product view). */
const isPoDraftReview = computed(() => {
  if (route.meta.ceoReselect) return false
  if (route.meta.poEdit) return false
  if ((route.meta.step as number | undefined) !== 8) return false
  if (authStore.isCeoOrAdmin) return false
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
  if (authStore.isCeoOrAdmin) return false
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

interface ExternalNamingPreview extends ExternalNaming {
  price_usd?: number | null
}

const detailConcept = ref<Concept | null>(null)

const concepts = computed(() => librariesStore.concepts)
const externalNamings = computed(() => librariesStore.externalNamings as ExternalNamingPreview[])
const internalNamings = computed(() => librariesStore.internalNamings)

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

/** Concept currently displayed in the right-column slider (independent of confirmation). */
const ceoReselectPreviewConcept = computed(() => {
  const id = store.ceoReselectDraft.conceptPreviewId ?? poConceptId.value
  if (!id) return null
  return concepts.value.find(c => c.id === id) ?? null
})

/** Confirmed CEO override concept (null = no CEO override yet). */
const ceoReselectConfirmedConcept = computed(() => {
  const id = store.ceoReselectDraft.conceptId
  if (!id) return null
  return concepts.value.find(c => c.id === id) ?? null
})

const ceoReselectIsShowingPo = computed(() => {
  const previewId = store.ceoReselectDraft.conceptPreviewId
  return !previewId || previewId === poConceptId.value
})

const ceoReselectIsShowingConfirmed = computed(() => {
  const previewId = store.ceoReselectDraft.conceptPreviewId
  const confirmedId = store.ceoReselectDraft.conceptId
  return Boolean(confirmedId && previewId === confirmedId)
})

const ceoReselectSliderTopLabel = computed<string | null>(() => {
  if (ceoReselectIsShowingPo.value) return 'Вибір замовника'
  if (ceoReselectIsShowingConfirmed.value) return 'Вибір CEO'
  return null
})

const ceoReselectSliderConfirmDisabled = computed(() => ceoReselectIsShowingPo.value)
const ceoReselectSliderCancelMode = computed(() => ceoReselectIsShowingConfirmed.value)

function handleCeoReselectSliderConfirm() {
  const previewId = store.ceoReselectDraft.conceptPreviewId
  if (!previewId || previewId === poConceptId.value) return
  store.setCeoReselectConcept(previewId)
}

function handleCeoReselectSliderCancel() {
  store.setCeoReselectConcept(null)
  store.setCeoReselectConceptPreview(poConceptId.value)
}

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

function confirmConceptFromSlider() {
  const id = store.stepData.concept.previewId ?? store.stepData.concept.selectedId
  if (!id) return
  store.setConcept({ selectedId: id, newConceptBrief: null })
}

const selectedExternalNamings = computed(() => {
  const ids = store.stepData?.externalNaming?.selectedIds ?? []
  return ids
    .map(id => externalNamings.value.find(item => item.id === id))
    .filter((item): item is ExternalNamingPreview => item != null)
})

const selectedInternalNaming = computed(() => {
  const id = store.stepData?.internalNaming?.selectedId
  if (!id) return null
  return internalNamings.value.find(item => item.id === id) ?? null
})

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

async function openConceptDetails() {
  const sc = selectedConcept.value
  if (!sc) return
  detailConcept.value = sc
  try {
    const full = await apiGet<Concept & { namings?: unknown[]; assets?: unknown[] }>(
      `/api/concepts/${sc.id}`
    )
    detailConcept.value = full
  } catch (err) {
    logSilent('ConstructorLayout/loadConceptDetail', err)
  }
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
const step10SelectedLayers = computed(() => buildLayers(true))

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
              <svg
                class="size-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M9 14 4 9l5-5" />
                <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11" />
              </svg>
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

      <!-- Right Panel: CEO finalize / PO draft / PO returned / approved read-only preview -->
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
        <ConceptMobilePreview v-else :concept="poEditMobilePreviewConcept" />
      </div>

      <!-- Right Panel: CEO re-select preview -->
      <div
        v-else-if="isCeoReselect"
        class="constructor-layout__right-panel constructor-layout__right-panel--ceo-reselect relative w-[58%] bg-white overflow-y-auto min-h-0 pt-[20px] pb-[100px] px-12"
      >
        <template v-if="route.name === 'ceo-reselect-concept'">
          <ConceptPreviewSlider
            :concept="ceoReselectPreviewConcept"
            :is-final-selected="false"
            :top-label="ceoReselectSliderTopLabel"
            :confirm-disabled="ceoReselectSliderConfirmDisabled"
            :cancel-mode="ceoReselectSliderCancelMode"
            @confirm-selection="handleCeoReselectSliderConfirm"
            @cancel-selection="handleCeoReselectSliderCancel"
          />
        </template>
        <ConceptMobilePreview v-else :concept="ceoReselectMobilePreviewConcept" />
      </div>

      <!-- Right Panel: Step 1/2/3/4/7/8 previews (hidden on full-width steps) -->
      <StepPreviewRightPanel
        v-else-if="!isFullWidth"
        :current-step="currentStep"
        :brand-basics="brandBasics"
        :concept-preview-for-slider="conceptPreviewForSlider"
        :is-concept-slider-final-selected="isConceptSliderFinalSelected"
        :selected-concept="selectedConcept"
        :selected-external-namings="selectedExternalNamings"
        :selected-internal-naming="selectedInternalNaming"
        :step9-selected-layers="step9SelectedLayers"
        :step10-selected-layers="step10SelectedLayers"
        :has-step9-selections="hasStep9Selections"
        :has-sidebar-selected="hasSidebarSelected"
        :step9-sidebar-visible="step9SidebarVisible"
        :delegate-to-designers="store.stepData.visualComponents.delegateToDesigners"
        :has-external-naming-brief="store.stepData.externalNaming.newNamingBrief !== null"
        :internal-naming-feedback="store.stepData.internalNaming.newNamingFeedback"
        @confirm-concept="confirmConceptFromSlider"
        @toggle-sidebar="toggleSidebarPreview"
        @open-concept-details="openConceptDetails"
      />

      <ConceptDetailOverlay
        v-if="detailConcept"
        :concept="detailConcept"
        :show-select-button="false"
        @close="detailConcept = null"
        @select="router.push('/constructor/step/2')"
      />

      <LayoutPreviewOverlays />
    </div>
  </div>
</template>
