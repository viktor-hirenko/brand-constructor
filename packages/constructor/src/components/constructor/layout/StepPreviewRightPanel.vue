<script setup lang="ts">
/**
 * Right-column preview panel for wizard steps 1, 2, 3/4 and 7.
 *
 * Owns the per-step visual previews so `ConstructorLayout` can focus on
 * mode-routing (CEO finalize / PO returned / approved / draft / etc.).
 * Shell/right-pane padding lives in `ConstructorDualPaneShell` via
 * `dualPaneLayoutClasses.ts`; this component renders preview content only.
 *
 * NOTE: Step 8 preview is NOT handled here — it lives in `ConstructorLayout`
 * via `BrandPreviewPanel` + `ReviewSubmitView` (review shell).
 * Do not re-add a step-8 branch to this component.
 */

import { ref, computed } from 'vue'
import ConceptPreviewSlider from '@/components/constructor/preview/ConceptPreviewSlider.vue'
import ConceptPreviewSliderSkeleton from '@/components/constructor/skeletons/ConceptPreviewSliderSkeleton.vue'
import ConceptPreviewEmptySkeleton from '@/components/constructor/skeletons/ConceptPreviewEmptySkeleton.vue'
import ConceptMobilePreview from '@/components/constructor/preview/ConceptMobilePreview.vue'
import CalendarIcon from '@/components/icons/CalendarIcon.vue'
import CloseIcon from '@/components/icons/CloseIcon.vue'
import ColumnsLayoutIcon from '@/components/icons/ColumnsLayoutIcon.vue'
import FileIcon from '@/components/icons/FileIcon.vue'
import GlobeIcon from '@/components/icons/GlobeIcon.vue'
import SparklesIcon from '@/components/icons/SparklesIcon.vue'
import type { Concept } from '@brand-constructor/shared/types'
import type { PreviewComposition, PreviewSlice } from '@/composables/useBrandPreviewLayers'
import { MOBILE_PHONE_PREVIEW_TITLE_GAP_CLASS } from '@/constants/previewLayout'
import PhonePreviewCanvas from '@/components/constructor/preview/PhonePreviewCanvas.vue'
import PhonePreviewSidebar from '@/components/constructor/preview/PhonePreviewSidebar.vue'
import PhonePreviewSlice from '@/components/constructor/preview/PhonePreviewSlice.vue'
import PreviewPanelToast from '@/components/ui/PreviewPanelToast.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'
import VisualComponentsPhoneEmptyState from '@/components/constructor/preview/VisualComponentsPhoneEmptyState.vue'
import type { VisualComponentsPhoneEmptyVariant } from '@/components/constructor/preview/VisualComponentsPhoneEmptyState.vue'
import {
  SIDEBAR_HIDDEN_CALLOUT_DURATION_MS,
  SIDEBAR_TEMPORARILY_HIDDEN_MESSAGE,
} from '@/constants/visualComponentPreviewMessages'

interface BrandBasics {
  geo: string[]
  launchDate: string
  linkedProduct: string
}

interface Props {
  currentStep: number
  brandBasics?: BrandBasics | null
  conceptPreviewForSlider: Concept | null
  isConceptSliderFinalSelected: boolean
  selectedConcept: Concept | null
  step7Composition: PreviewComposition
  step7OverlaySlice: PreviewSlice | null
  hasStep9Selections: boolean
  hasSidebarSelected: boolean
  step9SidebarVisible: boolean
  step9SidebarSlideAnimated: boolean
  sidebarHiddenCalloutVisible: boolean
  delegateToDesigners: boolean
  /** True while concept library is loading — prevents empty-state flash on step 2. */
  librariesLoading?: boolean
  /** Step 2: preview/selected id in store while libraries still loading. */
  hasStoredConceptSelection?: boolean
  /** Steps 3/4: PO ordered a new concept brief — no grid concept to preview. */
  hasOrderedNewConcept?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'confirm-concept': []
  'toggle-sidebar': []
  'sidebar-slide-leave-complete': []
}>()

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr + 'T00:00:00')
  const formatted = new Intl.DateTimeFormat('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
  return formatted.replace(/\s*р\.$/, '')
}

const hasGeo = (): boolean => (props.brandBasics?.geo?.length ?? 0) > 0
const hasDate = (): boolean => (props.brandBasics?.launchDate ?? '') !== ''
const hasLinkedProduct = (): boolean => (props.brandBasics?.linkedProduct ?? '').trim() !== ''
const hasAnyBasics = (): boolean => hasGeo() || hasDate() || hasLinkedProduct()

const sidebarTransitionLocked = ref(false)

function lockSidebarTransition() {
  if (props.step9SidebarSlideAnimated) {
    sidebarTransitionLocked.value = true
  }
}

function unlockSidebarTransition() {
  sidebarTransitionLocked.value = false
}

function handleSidebarAfterLeave() {
  unlockSidebarTransition()
  emit('sidebar-slide-leave-complete')
}

const step7EmptyVariant = computed((): VisualComponentsPhoneEmptyVariant =>
  props.delegateToDesigners ? 'delegated' : 'pick-components',
)
</script>

<template>
  <div class="relative flex flex-col flex-1 min-h-0 w-full h-full">
    <!-- Step 1 Preview -->
    <template v-if="currentStep === 1">
      <div class="flex flex-col flex-1 min-h-0 w-full">
      <div v-if="brandBasics && hasAnyBasics()" class="flex flex-col gap-8">
        <div
          v-if="hasGeo()"
          class="bg-white border border-black/10 rounded-[14px] shadow-[0px_10px_15px_rgba(0,0,0,0.1),0px_4px_6px_rgba(0,0,0,0.1)] p-8"
        >
          <div class="flex items-center gap-3 mb-4">
            <div
              class="size-12 rounded-[10px] bg-primary/10 flex items-center justify-center shrink-0"
            >
              <GlobeIcon class="size-6 text-primary" />
            </div>
            <h3 class="text-lg font-medium tracking-[-0.44px]">Географія бренду</h3>
          </div>
          <p class="text-2xl tracking-[0.07px]">
            {{ brandBasics.geo.join(', ') }}
          </p>
        </div>

        <div
          v-if="hasDate()"
          class="bg-white border border-black/10 rounded-[14px] shadow-[0px_10px_15px_rgba(0,0,0,0.1),0px_4px_6px_rgba(0,0,0,0.1)] p-8"
        >
          <div class="flex items-center gap-3 mb-4">
            <div
              class="size-12 rounded-[10px] bg-primary/10 flex items-center justify-center shrink-0"
            >
              <CalendarIcon class="size-6 text-primary" />
            </div>
            <h3 class="text-lg font-medium tracking-[-0.44px]">Плануєма дата запуску</h3>
          </div>
          <p class="text-2xl tracking-[0.07px]">
            {{ formatDate(brandBasics.launchDate) }}
          </p>
        </div>

        <div
          v-if="hasLinkedProduct()"
          class="bg-white border border-black/10 rounded-[14px] shadow-[0px_10px_15px_rgba(0,0,0,0.1),0px_4px_6px_rgba(0,0,0,0.1)] p-8"
        >
          <div class="flex items-center gap-3 mb-4">
            <div
              class="size-12 rounded-[10px] bg-primary/10 flex items-center justify-center shrink-0"
            >
              <FileIcon class="size-6 text-primary" />
            </div>
            <h3 class="text-lg font-medium tracking-[-0.44px]">Опис бренду</h3>
          </div>
          <p class="text-2xl tracking-[0.07px]">
            {{ brandBasics.linkedProduct }}
          </p>
        </div>
      </div>

      <div v-else class="flex flex-1 min-h-0 w-full items-center justify-center">
        <div class="flex flex-col items-center text-center text-muted-foreground">
          <GlobeIcon class="size-16 mb-4 opacity-30" />
          <p>Почніть заповнювати інформацію про бренд</p>
        </div>
      </div>
      </div>
    </template>

    <!-- Step 2: slider skeleton only when a concept is already stored (reload).
         Empty skeleton = reserved header gap + preview box, no fake title bars. -->
    <template v-else-if="currentStep === 2">
      <ConceptPreviewSliderSkeleton
        v-if="librariesLoading && hasStoredConceptSelection"
      />
      <ConceptPreviewEmptySkeleton v-else-if="librariesLoading" />
      <ConceptPreviewSlider
        v-else
        :concept="conceptPreviewForSlider"
        :is-final-selected="isConceptSliderFinalSelected"
        :top-label="isConceptSliderFinalSelected ? 'Обраний концепт' : null"
        hide-primary-action
      />
    </template>

    <!-- Step 3 / 4: same canvas skeleton as step 2 slider, single header line (no pill). -->
    <template v-else-if="currentStep === 3 || currentStep === 4">
      <ConceptPreviewSliderSkeleton
        v-if="librariesLoading && hasStoredConceptSelection"
        single-header-line
      />
      <ConceptMobilePreview
        v-else
        :concept="selectedConcept"
        :empty-mode="hasOrderedNewConcept && !selectedConcept ? 'ordered-concept' : 'select-first'"
      />
    </template>

    <!-- Step 7 Preview: iPhone screen assembled from Visual Components slices -->
    <template v-else-if="currentStep === 7">
      <div :class="['relative flex flex-col h-full', MOBILE_PHONE_PREVIEW_TITLE_GAP_CLASS]">
        <PreviewPanelToast
          :visible="sidebarHiddenCalloutVisible"
          :message="SIDEBAR_TEMPORARILY_HIDDEN_MESSAGE"
          :duration-ms="SIDEBAR_HIDDEN_CALLOUT_DURATION_MS"
        />
        <div class="flex items-center gap-2 shrink-0">
          <SparklesIcon class="size-6" />
          <span class="text-[1.25rem] font-medium leading-8 tracking-[-0.44px]">Превʼю</span>
        </div>
        <div class="flex flex-col items-center justify-center flex-1">
          <div class="relative">
            <PhonePreviewCanvas>
              <template v-if="step7Composition.top" #top>
                <PhonePreviewSlice :slice="step7Composition.top" />
              </template>

              <template #body>
                <VisualComponentsPhoneEmptyState
                  v-if="!hasStep9Selections"
                  :variant="step7EmptyVariant"
                />
                <template v-else>
                  <PhonePreviewSlice
                    v-for="slice in step7Composition.body"
                    :key="slice.typeId"
                    :slice="slice"
                  />
                </template>
              </template>

              <template v-if="step7Composition.bottom" #bottom>
                <PhonePreviewSlice :slice="step7Composition.bottom" />
              </template>

              <template #overlay="{ unitRem }">
                <Transition
                  name="sidebar-slide"
                  :css="step9SidebarSlideAnimated"
                  @before-enter="lockSidebarTransition"
                  @after-enter="unlockSidebarTransition"
                  @before-leave="lockSidebarTransition"
                  @after-leave="handleSidebarAfterLeave"
                >
                  <div
                    v-if="step7OverlaySlice && step9SidebarVisible"
                    :key="step7OverlaySlice.url"
                    class="absolute inset-0 overflow-hidden"
                  >
                    <PhonePreviewSidebar :slice="step7OverlaySlice" :unit-rem="unitRem" />
                  </div>
                </Transition>
              </template>
            </PhonePreviewCanvas>

            <!-- Sidebar toggle: 8px right, 42px top → 0.5rem / 2.625rem @16.
                 The inline `right`/`top` stay `rem` — named invariant of this
                 file in "Железные правила адаптива".
                 Kit icon button `3333:5541`, Glass S: it floats over the phone
                 render, which is the glass case, and the 16 glyph it already
                 carried is the S size. The box grows 28 → 32, the kit's S. -->
            <UiIconButton
              v-if="hasSidebarSelected"
              variant="glass"
              size="S"
              class="absolute disabled:pointer-events-none"
              :style="{ right: '0.5rem', top: '2.625rem', zIndex: 35 }"
              :disabled="sidebarTransitionLocked"
              :title="step9SidebarVisible ? 'Сховати сайдбар' : 'Показати сайдбар'"
              @click="emit('toggle-sidebar')"
            >
              <template #default="{ iconClass }">
                <CloseIcon v-if="step9SidebarVisible" :class="iconClass" />
                <ColumnsLayoutIcon v-else :class="iconClass" />
              </template>
            </UiIconButton>
          </div>
        </div>
      </div>
    </template>

    <!-- Other steps: generic placeholder -->
    <template v-else>
      <div class="flex items-center justify-center h-96">
        <div class="text-center text-muted-foreground">
          <SparklesIcon class="size-16 mx-auto mb-4 opacity-30" />
          <p>Превʼю буде доступне після реалізації цього кроку</p>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.sidebar-slide-enter-active,
.sidebar-slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.sidebar-slide-enter-from,
.sidebar-slide-leave-to {
  transform: translateY(100%);
}

@media (prefers-reduced-motion: reduce) {
  .sidebar-slide-enter-active,
  .sidebar-slide-leave-active {
    transition: none;
  }
}
</style>
