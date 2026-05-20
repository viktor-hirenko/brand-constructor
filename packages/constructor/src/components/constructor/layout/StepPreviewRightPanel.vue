<script setup lang="ts">
/**
 * Right-column preview panel for wizard steps 1, 2, 3/4, 7 and 8.
 *
 * Extracted from ConstructorLayout.vue (F-07) so the layout shell can focus on
 * mode-routing while this component owns the per-step visual previews.
 *
 * The outer 58%-width wrapper (with bg + scroll + padding) is kept inside the
 * component so the parent only needs to render `<StepPreviewRightPanel ... />`
 * in place of the legacy `v-else-if="!isFullWidth"` branch.
 */

import { getAssetUrl } from '@/composables/useApi'
import ConceptPreviewSlider from '@/components/constructor/ConceptPreviewSlider.vue'
import ConceptMobilePreview from '@/components/constructor/ConceptMobilePreview.vue'
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
              <svg
                class="size-6 text-primary"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                <path d="M2 12h20" />
              </svg>
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
              <svg
                class="size-6 text-primary"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M8 2v4" />
                <path d="M16 2v4" />
                <rect width="18" height="18" x="3" y="4" rx="2" />
                <path d="M3 10h18" />
              </svg>
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
              <svg
                class="size-6 text-primary"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                <path d="M10 9H8" />
                <path d="M16 13H8" />
                <path d="M16 17H8" />
              </svg>
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
          <svg
            class="size-16 mx-auto mb-4 opacity-30"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
            <path d="M2 12h20" />
          </svg>
          <p>Почніть заповнювати інформацію про бренд</p>
        </div>
      </div>
    </template>

    <!-- Step 2 Preview: concept slider -->
    <template v-else-if="currentStep === 2">
      <ConceptPreviewSlider
        :concept="conceptPreviewForSlider"
        :is-final-selected="isConceptSliderFinalSelected"
        @confirm-selection="emit('confirm-concept')"
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
          <svg
            class="size-5"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
            <path d="M12 18h.01" />
          </svg>
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
                <svg
                  class="size-12 text-muted-foreground mx-auto mb-3"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
                  <path d="M12 18h.01" />
                </svg>
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
                <svg
                  v-if="step9SidebarVisible"
                  class="size-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
                <svg
                  v-else
                  class="size-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                  <path d="M9 3v18" />
                </svg>
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
              <svg
                class="size-10 opacity-30"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
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
                  <svg
                    class="size-4 text-primary"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path
                      d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"
                    />
                    <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
                  </svg>
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
                  <svg
                    class="size-4 text-primary"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                    <rect width="20" height="14" x="2" y="6" rx="2" />
                  </svg>
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
          <svg
            class="size-16 mx-auto mb-4 opacity-30"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"
            />
            <path d="M20 3v4" />
            <path d="M22 5h-4" />
            <path d="M4 17v2" />
            <path d="M5 18H3" />
          </svg>
          <p>Превʼю буде доступне після реалізації цього кроку</p>
        </div>
      </div>
    </template>
  </div>
</template>
