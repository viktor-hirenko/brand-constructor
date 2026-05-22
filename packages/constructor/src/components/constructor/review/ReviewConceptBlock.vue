<script setup lang="ts">
import { computed } from 'vue'
import type { Concept } from '@brand-constructor/shared/types'
import { getAssetUrl } from '@/composables/useApi'
import ApplyCeoVariantButton from './ApplyCeoVariantButton.vue'
import ReviewChoiceGroup from './ReviewChoiceGroup.vue'
import EyeIcon from '@/components/icons/EyeIcon.vue'
import FileIcon from '@/components/icons/FileIcon.vue'
import MoonIcon from '@/components/icons/MoonIcon.vue'
import SunIcon from '@/components/icons/SunIcon.vue'

interface ReviewConceptBlockProps {
  concept: Concept | null
  /** When set, shows side-by-side PO vs CEO picks (CEO finalize review). */
  ceoConcept?: Concept | null
  /** "light" | "dark" — drives the Mode row label/icon. */
  mode: 'light' | 'dark' | null
  /** When true and `concept` is null, show "Новий концепт (бриф)" placeholder. */
  isNewConcept?: boolean
  /**
   * PO returned-from-CEO: CEO proposed an alternative concept and PO
   * hasn't resolved it yet → show dual-view + "Застосувати варіант CEO" button.
   */
  showApplyCeo?: boolean
  /** Whether an apply operation is currently in-flight (disables button). */
  applyLoading?: boolean
  /**
   * PO applied CEO concept → show single card labeled "Обраний концепт"
   * instead of dual-view.
   */
  ceoApplied?: boolean
}

const props = withDefaults(defineProps<ReviewConceptBlockProps>(), {
  ceoConcept: null,
  isNewConcept: false,
  showApplyCeo: false,
  applyLoading: false,
  ceoApplied: false,
})

const emit = defineEmits<{
  preview: [concept: Concept]
  applyCeo: []
  previewBrief: []
}>()

const previewUrl = computed(() => {
  const url = props.concept?.visual_url || props.concept?.gallery_url_1
  return url && url.trim() !== '' ? getAssetUrl(url) : null
})

const ceoPreviewUrl = computed(() => {
  const c = props.ceoConcept
  if (!c) return null
  const url = c.visual_url || c.gallery_url_1
  return url && url.trim() !== '' ? getAssetUrl(url) : null
})

const conceptName = computed(() => {
  if (props.concept) return props.concept.name
  if (props.isNewConcept) return 'Новий концепт (бриф)'
  return null
})

const modeLabel = computed(() => (props.mode === 'dark' ? 'Dark' : 'Light'))

/** Show dual PO/CEO cards when CEO has an alternative and it's not yet applied. */
const showDual = computed(() => props.ceoConcept != null && !props.ceoApplied)

const layout = computed<'applied' | 'dual' | 'single'>(() => {
  if (showDual.value) return 'dual'
  if (props.ceoApplied) return 'applied'
  return 'single'
})

const layoutModifier = computed(() => {
  if (showDual.value) return 'review-concept-block--dual-view'
  if (props.ceoApplied) return 'review-concept-block--applied'
  return 'review-concept-block--single'
})

const singlePoLabel = 'Вибір Замовника'
</script>

<template>
  <div :class="['review-concept-block flex flex-col gap-4', layoutModifier]">
    <!-- Mode row -->
    <div class="review-concept-block__mode flex items-start gap-2">
      <div class="size-5 shrink-0 text-[#5B5B62]">
        <MoonIcon v-if="mode === 'dark'" class="size-5" />
        <SunIcon v-else class="size-5" />
      </div>
      <div class="flex-1 min-w-0 flex flex-col gap-1">
        <p class="text-[14px] font-medium leading-4 text-[#5B5B62]">Mode</p>
        <p class="text-[16px] leading-6 tracking-[-0.1504px] text-[#1A1A1A]">
          {{ modeLabel }}
        </p>
      </div>
    </div>

    <ReviewChoiceGroup
      :layout="layout"
      applied-label="Обраний концепт"
      :po-label="singlePoLabel"
      dual-grid
      column-inner-gap="gap-2"
    >
      <template #po>
        <div
          v-if="concept && previewUrl"
          class="review-concept-block__card relative w-full aspect-square rounded-2xl overflow-hidden bg-muted"
        >
          <img
            :src="previewUrl"
            :alt="concept.name"
            class="w-full h-full object-cover"
            loading="lazy"
          />
          <div
            class="absolute inset-x-0 bottom-0 px-4 pt-12 pb-4 bg-gradient-to-t from-black/70 to-transparent"
          >
            <p class="text-[16px] font-medium leading-6 tracking-[-0.1504px] text-white">
              {{ concept.name }}
            </p>
          </div>
          <button
            type="button"
            class="review-concept-block__preview-button absolute top-1 right-1 inline-flex items-center justify-center size-8 rounded-full bg-white/90 hover:bg-white transition-colors text-[#030213]"
            aria-label="Переглянути концепт"
            @click="concept && emit('preview', concept)"
          >
            <EyeIcon />
          </button>
        </div>
        <div
          v-else-if="isNewConcept"
          class="review-concept-block__card review-concept-block__card--brief relative w-full aspect-square rounded-2xl overflow-hidden bg-[#f3f3f5] flex flex-col items-center justify-center gap-3 text-[#5B5B62]"
        >
          <FileIcon class="size-10 opacity-60" :stroke-width="1.5" />
          <p class="text-[14px] font-medium leading-5 tracking-[-0.1504px] text-[#1A1A1A] text-center px-4">
            Бриф нового концепту
          </p>
          <button
            type="button"
            class="review-concept-block__preview-button absolute top-1 right-1 inline-flex items-center justify-center size-8 rounded-full bg-white/90 hover:bg-white transition-colors text-[#030213]"
            aria-label="Переглянути бриф нового концепту"
            @click="emit('previewBrief')"
          >
            <EyeIcon />
          </button>
        </div>
        <div
          v-else-if="conceptName"
          class="review-concept-block__placeholder rounded-2xl border border-dashed border-black/15 px-4 py-6 text-[14px] text-[#5B5B62] w-full"
        >
          {{ conceptName }}
        </div>
        <div v-else class="review-concept-block__empty text-[14px] text-[#5B5B62] italic">
          Концепт не обрано
        </div>
      </template>

      <template #ceo>
        <div
          v-if="ceoConcept && ceoPreviewUrl"
          class="review-concept-block__card relative w-full aspect-square rounded-2xl overflow-hidden bg-muted"
        >
          <img
            :src="ceoPreviewUrl"
            :alt="ceoConcept.name"
            class="w-full h-full object-cover"
            loading="lazy"
          />
          <div
            class="absolute inset-x-0 bottom-0 px-4 pt-12 pb-4 bg-gradient-to-t from-black/70 to-transparent"
          >
            <p class="text-[16px] font-medium leading-6 tracking-[-0.1504px] text-white">
              {{ ceoConcept.name }}
            </p>
          </div>
          <button
            type="button"
            class="review-concept-block__preview-button absolute top-1 right-1 inline-flex items-center justify-center size-8 rounded-full bg-white/90 hover:bg-white transition-colors z-[2] text-[#030213]"
            aria-label="Переглянути концепт CEO"
            @click="ceoConcept && emit('preview', ceoConcept)"
          >
            <EyeIcon />
          </button>
        </div>
      </template>

      <template #applied>
        <div
          v-if="concept && previewUrl"
          class="review-concept-block__card relative w-[230px] h-[230px] rounded-2xl overflow-hidden bg-muted"
        >
          <img :src="previewUrl" :alt="concept.name" class="w-full h-full object-cover" loading="lazy" />
          <div class="absolute inset-x-0 bottom-0 px-4 pt-12 pb-4 bg-gradient-to-t from-black/70 to-transparent">
            <p class="text-[16px] font-medium leading-6 tracking-[-0.1504px] text-white">{{ concept.name }}</p>
          </div>
          <button
            v-if="concept"
            type="button"
            class="review-concept-block__preview-button absolute top-1 right-1 inline-flex items-center justify-center size-8 rounded-full bg-white/90 hover:bg-white transition-colors text-[#030213]"
            aria-label="Переглянути концепт"
            @click="emit('preview', concept)"
          >
            <EyeIcon />
          </button>
        </div>
        <div
          v-else-if="conceptName"
          class="review-concept-block__placeholder rounded-2xl border border-dashed border-black/15 px-4 py-6 text-[14px] text-[#5B5B62]"
        >
          {{ conceptName }}
        </div>
      </template>

      <template #single>
        <div
          v-if="concept && previewUrl"
          class="review-concept-block__card relative w-[230px] h-[230px] rounded-2xl overflow-hidden bg-muted"
        >
          <img :src="previewUrl" :alt="concept.name" class="w-full h-full object-cover" loading="lazy" />
          <div class="absolute inset-x-0 bottom-0 px-4 pt-12 pb-4 bg-gradient-to-t from-black/70 to-transparent">
            <p class="text-[16px] font-medium leading-6 tracking-[-0.1504px] text-white">{{ concept.name }}</p>
          </div>
          <button
            v-if="concept"
            type="button"
            class="review-concept-block__preview-button absolute top-1 right-1 inline-flex items-center justify-center size-8 rounded-full bg-white/90 hover:bg-white transition-colors text-[#030213]"
            aria-label="Переглянути концепт"
            @click="emit('preview', concept)"
          >
            <EyeIcon />
          </button>
        </div>
        <div
          v-else-if="isNewConcept"
          class="review-concept-block__card review-concept-block__card--brief relative w-[230px] h-[230px] rounded-2xl overflow-hidden bg-[#f3f3f5] flex flex-col items-center justify-center gap-3 text-[#5B5B62]"
        >
          <FileIcon class="size-10 opacity-60" :stroke-width="1.5" />
          <p class="text-[14px] font-medium leading-5 tracking-[-0.1504px] text-[#1A1A1A] text-center px-4">
            Бриф нового концепту
          </p>
          <button
            type="button"
            class="review-concept-block__preview-button absolute top-1 right-1 inline-flex items-center justify-center size-8 rounded-full bg-white/90 hover:bg-white transition-colors text-[#030213]"
            aria-label="Переглянути бриф нового концепту"
            @click="emit('previewBrief')"
          >
            <EyeIcon />
          </button>
        </div>
        <div
          v-else-if="conceptName"
          class="review-concept-block__placeholder rounded-2xl border border-dashed border-black/15 px-4 py-6 text-[14px] text-[#5B5B62]"
        >
          {{ conceptName }}
        </div>
        <div v-else class="review-concept-block__empty text-[14px] text-[#5B5B62] italic">
          Концепт не обрано
        </div>
      </template>

      <template v-if="showDual && showApplyCeo" #actions>
        <ApplyCeoVariantButton :loading="applyLoading" @click="emit('applyCeo')" />
      </template>
    </ReviewChoiceGroup>
  </div>
</template>
