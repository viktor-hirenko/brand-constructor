<script setup lang="ts">
import { computed } from 'vue'
import type { Concept } from '@brand-constructor/shared/types'
import { getAssetUrl } from '@/composables/useApi'
import { CONCEPT_CARD_TITLE_GRADIENT } from '@/constants/conceptCardVisual'
import ApplyCeoVariantButton from './ApplyCeoVariantButton.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'
import UiProperty from '@/components/ui/UiProperty.vue'
import ReviewChoiceGroup from './ReviewChoiceGroup.vue'
import EyeIcon from '@/components/icons/EyeIcon.vue'
import FileIcon from '@/components/icons/FileIcon.vue'
import PaletteIcon from '@/components/icons/PaletteIcon.vue'

// Concept cards: 230×230px → 14.375rem @16 design base (fluid in embed).
//
// The eye on a card is the kit's icon button, Solid at S-32 — `get_variable_defs`
// on the drawn Concept section (`5387:91785`) returns `button/secondary/bg/default`
// #ffffff, `button/secondary/border` #eaeaeb and `radius/icon-button` 1000 for it,
// which is the Solid recipe DP-15258 phase 8 built (Solid IS Secondary; there is
// no `button/solid/*` family). Not Glass: Glass is the translucent dark control
// that sits on the preview panel's own image, and the kit draws this one white.

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
    <UiProperty
      class="review-concept-block__mode"
      type="icon-label-value"
      label="Mode"
      :value="modeLabel"
    >
      <!--
        One glyph for both values, on purpose. The mapping table's row
        "Тема | sun → Palette, Regular" is this slot, and all four drawn review
        screens (`5387:91764`, `5387:78989`, `5395:107395`, `5387:105225`) show
        Palette against "Mode / Light" — the kit never swaps it for the dark
        value. Sun and moon were ours; the kit has no moon at all.
      -->
      <template #icon="{ iconClass }">
        <PaletteIcon :class="iconClass" />
      </template>
    </UiProperty>

    <ReviewChoiceGroup
      :layout="layout"
      applied-label="Обраний концепт"
      :po-label="singlePoLabel"
      dual-grid
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
            class="pointer-events-none absolute inset-0 z-[1]"
            :style="{ background: CONCEPT_CARD_TITLE_GRADIENT }"
          />
          <div class="absolute bottom-0 left-0 right-0 z-[2] px-4 pb-4">
            <p class="text-[1rem] font-medium leading-6 text-white">
              {{ concept.name }}
            </p>
          </div>
          <UiIconButton
            variant="solid"
            size="S"
            class="review-concept-block__preview-button absolute top-1 right-1"
            aria-label="Переглянути концепт"
            @click="concept && emit('preview', concept)"
          >
            <template #default="{ iconClass }">
              <EyeIcon :class="iconClass" />
            </template>
          </UiIconButton>
        </div>
        <div
          v-else-if="isNewConcept"
          class="review-concept-block__card review-concept-block__card--brief relative w-full aspect-square rounded-2xl overflow-hidden bg-ink-200 flex flex-col items-center justify-center gap-3 text-ink-700"
        >
          <FileIcon class="size-10 opacity-60" :stroke-width="1.5" />
          <p class="text-[0.875rem] font-medium leading-5 text-ink-900 text-center px-4">
            Бриф нового концепту
          </p>
          <UiIconButton
            variant="solid"
            size="S"
            class="review-concept-block__preview-button absolute top-1 right-1"
            aria-label="Переглянути бриф нового концепту"
            @click="emit('previewBrief')"
          >
            <template #default="{ iconClass }">
              <EyeIcon :class="iconClass" />
            </template>
          </UiIconButton>
        </div>
        <div
          v-else-if="conceptName"
          class="review-concept-block__placeholder rounded-2xl border border-ink-300 px-4 py-6 text-[0.875rem] text-ink-700 w-full"
        >
          {{ conceptName }}
        </div>
        <div v-else class="review-concept-block__empty text-[0.875rem] text-ink-700 italic">
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
            class="pointer-events-none absolute inset-0 z-[1]"
            :style="{ background: CONCEPT_CARD_TITLE_GRADIENT }"
          />
          <div class="absolute bottom-0 left-0 right-0 z-[2] px-4 pb-4">
            <p class="text-[1rem] font-medium leading-6 text-white">
              {{ ceoConcept.name }}
            </p>
          </div>
          <UiIconButton
            variant="solid"
            size="S"
            class="review-concept-block__preview-button absolute top-1 right-1 z-[2]"
            aria-label="Переглянути концепт CEO"
            @click="ceoConcept && emit('preview', ceoConcept)"
          >
            <template #default="{ iconClass }">
              <EyeIcon :class="iconClass" />
            </template>
          </UiIconButton>
        </div>
      </template>

      <template #applied>
        <div
          v-if="concept && previewUrl"
          class="review-concept-block__card relative w-[14.375rem] h-[14.375rem] rounded-2xl overflow-hidden bg-muted"
        >
          <img :src="previewUrl" :alt="concept.name" class="w-full h-full object-cover" loading="lazy" />
          <div
            class="pointer-events-none absolute inset-0 z-[1]"
            :style="{ background: CONCEPT_CARD_TITLE_GRADIENT }"
          />
          <div class="absolute bottom-0 left-0 right-0 z-[2] px-4 pb-4">
            <p class="text-[1rem] font-medium leading-6 text-white">{{ concept.name }}</p>
          </div>
          <UiIconButton
            v-if="concept"
            variant="solid"
            size="S"
            class="review-concept-block__preview-button absolute top-1 right-1"
            aria-label="Переглянути концепт"
            @click="emit('preview', concept)"
          >
            <template #default="{ iconClass }">
              <EyeIcon :class="iconClass" />
            </template>
          </UiIconButton>
        </div>
        <div
          v-else-if="conceptName"
          class="review-concept-block__placeholder rounded-2xl border border-ink-300 px-4 py-6 text-[0.875rem] text-ink-700"
        >
          {{ conceptName }}
        </div>
      </template>

      <template #single>
        <div
          v-if="concept && previewUrl"
          class="review-concept-block__card relative w-[14.375rem] h-[14.375rem] rounded-2xl overflow-hidden bg-muted"
        >
          <img :src="previewUrl" :alt="concept.name" class="w-full h-full object-cover" loading="lazy" />
          <div
            class="pointer-events-none absolute inset-0 z-[1]"
            :style="{ background: CONCEPT_CARD_TITLE_GRADIENT }"
          />
          <div class="absolute bottom-0 left-0 right-0 z-[2] px-4 pb-4">
            <p class="text-[1rem] font-medium leading-6 text-white">{{ concept.name }}</p>
          </div>
          <UiIconButton
            v-if="concept"
            variant="solid"
            size="S"
            class="review-concept-block__preview-button absolute top-1 right-1"
            aria-label="Переглянути концепт"
            @click="emit('preview', concept)"
          >
            <template #default="{ iconClass }">
              <EyeIcon :class="iconClass" />
            </template>
          </UiIconButton>
        </div>
        <div
          v-else-if="isNewConcept"
          class="review-concept-block__card review-concept-block__card--brief relative w-[14.375rem] h-[14.375rem] rounded-2xl overflow-hidden bg-ink-200 flex flex-col items-center justify-center gap-3 text-ink-700"
        >
          <FileIcon class="size-10 opacity-60" :stroke-width="1.5" />
          <p class="text-[0.875rem] font-medium leading-5 text-ink-900 text-center px-4">
            Бриф нового концепту
          </p>
          <UiIconButton
            variant="solid"
            size="S"
            class="review-concept-block__preview-button absolute top-1 right-1"
            aria-label="Переглянути бриф нового концепту"
            @click="emit('previewBrief')"
          >
            <template #default="{ iconClass }">
              <EyeIcon :class="iconClass" />
            </template>
          </UiIconButton>
        </div>
        <div
          v-else-if="conceptName"
          class="review-concept-block__placeholder rounded-2xl border border-ink-300 px-4 py-6 text-[0.875rem] text-ink-700"
        >
          {{ conceptName }}
        </div>
        <div v-else class="review-concept-block__empty text-[0.875rem] text-ink-700 italic">
          Концепт не обрано
        </div>
      </template>

      <template v-if="showDual && showApplyCeo" #actions>
        <ApplyCeoVariantButton :loading="applyLoading" @click="emit('applyCeo')" />
      </template>
    </ReviewChoiceGroup>
  </div>
</template>
