<script setup lang="ts">
/**
 * Right-column preview panel for wizard steps 1, 2, 3/4, 7 and 8.
 *
 * Owns the per-step visual previews so `ConstructorLayout` can focus on
 * mode-routing (CEO finalize / PO returned / approved / draft / etc.).
 * The outer 58%-width wrapper (background, scroll, padding) is encapsulated
 * inside this component, so parents render a single `<StepPreviewRightPanel>`
 * in the non-full-width branch of the layout.
 */

import { getAssetUrl } from '@/composables/useApi'
import ConceptPreviewSlider from '@/components/constructor/preview/ConceptPreviewSlider.vue'
import ConceptMobilePreview from '@/components/constructor/preview/ConceptMobilePreview.vue'
import BriefcaseIcon from '@/components/icons/BriefcaseIcon.vue'
import CalendarIcon from '@/components/icons/CalendarIcon.vue'
import CloseIcon from '@/components/icons/CloseIcon.vue'
import ColumnsLayoutIcon from '@/components/icons/ColumnsLayoutIcon.vue'
import FileIcon from '@/components/icons/FileIcon.vue'
import GlobeIcon from '@/components/icons/GlobeIcon.vue'
import ImagePlaceholderIcon from '@/components/icons/ImagePlaceholderIcon.vue'
import SmartphoneIcon from '@/components/icons/SmartphoneIcon.vue'
import SparklesIcon from '@/components/icons/SparklesIcon.vue'
import TagIcon from '@/components/icons/TagIcon.vue'
import type { Concept, ExternalNaming, InternalNaming } from '@brand-constructor/shared/types'
import type { PreviewLayer } from '@/composables/useBrandPreviewLayers'

interface BrandBasics {
  geo: string[]
  launchDate: string
  linkedProduct: string
}

interface ExternalNamingPreview extends ExternalNaming {
  price_usd?: number | null
}

interface Props {
  currentStep: number
  brandBasics?: BrandBasics | null
  conceptPreviewForSlider: Concept | null
  isConceptSliderFinalSelected: boolean
  selectedConcept: Concept | null
  selectedExternalNamings: ExternalNamingPreview[]
  selectedInternalNaming: InternalNaming | null
  step9SelectedLayers: PreviewLayer[]
  step10SelectedLayers: PreviewLayer[]
  hasStep9Selections: boolean
  hasSidebarSelected: boolean
  step9SidebarVisible: boolean
  delegateToDesigners: boolean
  hasExternalNamingBrief: boolean
  internalNamingFeedback: string | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'confirm-concept': []
  'toggle-sidebar': []
  'open-concept-details': []
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
</script>

<template>
  <div
    class="relative w-[58%] bg-white px-12 overflow-y-auto min-h-0"
    :class="currentStep >= 2 && currentStep <= 4 ? 'pt-[20px] pb-[100px]' : 'pt-12 pb-12'"
  >
    <!-- Step 1 Preview -->
    <template v-if="currentStep === 1">
      <div v-if="brandBasics && hasAnyBasics()" class="flex flex-col gap-6">
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

      <div v-else class="flex items-center justify-center h-96">
        <div class="text-center text-muted-foreground">
          <GlobeIcon class="size-16 mx-auto mb-4 opacity-30" />
          <p>Почніть заповнювати інформацію про бренд</p>
        </div>
      </div>
    </template>

    <!-- Step 2 Preview: concept slider — selection happens immediately on card click -->
    <template v-else-if="currentStep === 2">
      <ConceptPreviewSlider
        :concept="conceptPreviewForSlider"
        :is-final-selected="isConceptSliderFinalSelected"
        :top-label="isConceptSliderFinalSelected ? 'Обраний концепт' : null"
        hide-primary-action
      />
    </template>

    <!-- Step 3 / 4: mobile preview of selected concept -->
    <template v-else-if="currentStep === 3 || currentStep === 4">
      <ConceptMobilePreview :concept="selectedConcept" />
    </template>

    <!-- Step 7 Preview: iPhone with layered Visual Components -->
    <template v-else-if="currentStep === 7">
      <div class="flex flex-col items-center justify-center h-full">
        <div class="flex items-center gap-2 mb-6 text-muted-foreground">
          <SmartphoneIcon class="size-5" />
          <span class="text-sm">iPhone 16 Plus Preview</span>
        </div>
        <div class="relative" style="width: 311.25px; height: 632.25px">
          <div class="absolute inset-0" style="z-index: 0">
            <img
              src="/assets/iphone-16-plus-light.png"
              alt="iPhone frame"
              class="object-cover"
              style="width: 311.25px; height: 632.25px"
            />
          </div>
          <div
            class="absolute overflow-hidden"
            style="left: 9px; top: 9px; width: 288.75px; height: 614.25px; z-index: 10"
          >
            <div
              v-if="!hasStep9Selections"
              class="h-full flex items-center justify-center p-6 text-center bg-white/90 backdrop-blur-sm rounded-[40px]"
            >
              <div>
                <SmartphoneIcon class="size-12 text-muted-foreground mx-auto mb-3" />
                <p class="text-sm text-muted-foreground">
                  {{
                    delegateToDesigners
                      ? 'Вибір компонентів делеговано дизайнерам'
                      : 'Оберіть компоненти щоб побачити превʼю'
                  }}
                </p>
              </div>
            </div>
            <div v-else class="relative w-full h-full overflow-hidden rounded-[40px]">
              <div
                v-for="layer in step9SelectedLayers"
                :key="layer.typeId"
                class="absolute transition-opacity duration-300"
                :style="{
                  left: layer.slot.left,
                  top: layer.slot.top,
                  width: layer.slot.width,
                  height: layer.slot.height,
                  zIndex: layer.slot.zIndex,
                }"
              >
                <img
                  :src="layer.url"
                  :alt="layer.typeId"
                  :class="
                    layer.slot.contain
                      ? 'w-full h-full object-contain'
                      : 'w-full h-full object-cover'
                  "
                />
              </div>
              <button
                v-if="hasSidebarSelected"
                class="absolute flex items-center justify-center size-7 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm transition-colors"
                :style="{ right: '8px', top: '42px', zIndex: 35 }"
                :title="step9SidebarVisible ? 'Сховати сайдбар' : 'Показати сайдбар'"
                @click="emit('toggle-sidebar')"
              >
                <CloseIcon
                  v-if="step9SidebarVisible"
                  class="size-4 text-white"
                />
                <ColumnsLayoutIcon v-else class="size-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Step 8 Preview: Brand summary card + iPhone -->
    <template v-else-if="currentStep === 8">
      <div class="space-y-8">
        <div class="p-6 bg-card border border-black/10 rounded-xl shadow-lg flex gap-6">
          <div class="relative w-32 h-32 rounded-lg overflow-hidden bg-muted shrink-0">
            <img
              v-if="selectedConcept?.visual_url"
              :src="getAssetUrl(selectedConcept.visual_url)"
              :alt="selectedConcept.name"
              class="w-full h-full object-cover"
              loading="lazy"
            />
            <div
              v-else
              class="w-full h-full flex items-center justify-center text-muted-foreground"
            >
              <ImagePlaceholderIcon class="size-10 opacity-30" />
            </div>
          </div>
          <div class="flex-1 flex flex-col justify-center space-y-4">
            <button
              v-if="selectedConcept"
              type="button"
              class="h-7 px-3 rounded-[10px] border border-black/10 text-xs font-medium hover:bg-black/[0.02] transition-all self-start"
              @click="emit('open-concept-details')"
            >
              Переглянути деталі
            </button>
            <div class="flex flex-col gap-3">
              <div v-if="selectedExternalNamings.length > 0 || hasExternalNamingBrief">
                <div class="flex items-center gap-2 mb-2">
                  <TagIcon class="size-4 text-primary" />
                  <span class="text-xs text-muted-foreground">Зовнішня назва</span>
                </div>
                <p class="font-medium text-lg">
                  {{
                    selectedExternalNamings.length > 0
                      ? selectedExternalNamings.map(n => n.name).join(', ')
                      : 'Новий неймінг (бриф)'
                  }}
                </p>
              </div>
              <div v-if="selectedInternalNaming || internalNamingFeedback">
                <div class="flex items-center gap-2 mb-2">
                  <BriefcaseIcon class="size-4 text-primary" />
                  <span class="text-xs text-muted-foreground">Внутрішня назва</span>
                </div>
                <p class="font-medium">
                  {{ selectedInternalNaming?.name || internalNamingFeedback }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="flex flex-col items-center">
          <div class="relative" style="width: 207.5px; height: 421.5px">
            <img
              src="/assets/iphone-16-plus-light.png"
              alt="iPhone frame"
              class="absolute inset-0 object-cover"
              style="width: 207.5px; height: 421.5px; z-index: 0"
            />
            <div
              class="absolute overflow-hidden"
              style="left: 6px; top: 6px; width: 192.5px; height: 409.5px; z-index: 10"
            >
              <div
                v-if="!hasStep9Selections"
                class="h-full flex items-center justify-center p-4 text-center bg-white/90 backdrop-blur-sm rounded-[27px]"
              >
                <p class="text-xs text-muted-foreground">Оберіть компоненти на кроці 7</p>
              </div>
              <div
                v-else
                class="relative w-full h-full overflow-hidden rounded-[40px]"
                style="
                  transform: scale(0.667);
                  transform-origin: top left;
                  width: 288.75px;
                  height: 614.25px;
                "
              >
                <div
                  v-for="layer in step10SelectedLayers"
                  :key="layer.typeId"
                  class="absolute"
                  :style="{
                    left: layer.slot.left,
                    top: layer.slot.top,
                    width: layer.slot.width,
                    height: layer.slot.height,
                    zIndex: layer.slot.zIndex,
                  }"
                >
                  <img
                    :src="layer.url"
                    :alt="layer.typeId"
                    :class="
                      layer.slot.contain
                        ? 'w-full h-full object-contain'
                        : 'w-full h-full object-cover'
                    "
                  />
                </div>
              </div>
            </div>
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
