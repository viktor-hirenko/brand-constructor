<script setup lang="ts">
/**
 * Single source of truth for the visual representation of a Concept card.
 *
 * Used by:
 *  - `ConceptGrid` (selectable grid with hover-overlay, optional selection ring)
 *  - `PoEditConceptView` (header CEO/PO cards + post-apply applied card)
 *  - Any future place that needs to render a concept tile.
 *
 * States (Figma 2201:6968):
 *  - Default: 1px border, 45% dim overlay, bottom gradient
 *  - Hover (clickable): dim overlay fades out
 *  - Selected: 2px border, white inner ring, checkmark, no dim
 */
import { computed } from 'vue'
import type { Concept } from '@brand-constructor/shared/types'
import { getAssetUrl } from '@/composables/useApi'
import {
  CONCEPT_CARD_BORDER_COLOR_DEFAULT,
  CONCEPT_CARD_BORDER_COLOR_SELECTED,
  CONCEPT_CARD_DIM_OVERLAY_COLOR,
  CONCEPT_CARD_TITLE_GRADIENT,
} from '@/constants/conceptCardVisual'
import CheckIcon from '@/components/icons/CheckIcon.vue'
import ImagePlaceholderIcon from '@/components/icons/ImagePlaceholderIcon.vue'

const props = withDefaults(
  defineProps<{
    concept: Concept | null
    isSelected?: boolean
    isActive?: boolean
    showSelectionRing?: boolean
    showCheckmark?: boolean
    clickable?: boolean
    disabled?: boolean
    /** Dim overlay when not selected/active; removed on hover when clickable. */
    showOverlay?: boolean
  }>(),
  {
    isSelected: false,
    isActive: false,
    showSelectionRing: false,
    showCheckmark: false,
    clickable: true,
    disabled: false,
    showOverlay: false,
  },
)

const emit = defineEmits<{
  click: []
}>()

const isHighlighted = computed(() => props.isSelected || props.isActive)

const showDimOverlay = computed(
  () => props.showOverlay && props.concept != null && !isHighlighted.value,
)

const overlayClass = computed(() => {
  if (!showDimOverlay.value) return 'opacity-0'
  if (props.disabled || !props.clickable) return 'opacity-100'
  return 'opacity-100 group-hover:opacity-0'
})

function handleClick() {
  if (props.disabled || !props.clickable) return
  emit('click')
}
</script>

<template>
  <div
    class="concept-card group relative w-full aspect-square overflow-hidden rounded-[16px] transition-[border-color] duration-200"
    :class="[
      disabled
        ? 'cursor-not-allowed'
        : clickable
          ? 'cursor-pointer'
          : 'cursor-default',
      isSelected ? 'border-2' : 'border',
    ]"
    :style="{
      borderColor: isSelected ? CONCEPT_CARD_BORDER_COLOR_SELECTED : CONCEPT_CARD_BORDER_COLOR_DEFAULT,
    }"
    @click="handleClick"
  >
    <div class="concept-card__media absolute inset-0 bg-muted">
      <template v-if="concept">
        <img
          v-if="concept.visual_url"
          :src="getAssetUrl(concept.visual_url)"
          :alt="concept.name"
          class="concept-card__image h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
        <div
          v-else
          class="concept-card__placeholder flex h-full w-full items-center justify-center text-muted-foreground"
        >
          <ImagePlaceholderIcon class="size-12 opacity-30" />
        </div>

        <div
          v-if="showOverlay"
          class="concept-card__overlay pointer-events-none absolute inset-0 z-[1] transition-opacity duration-200"
          :class="overlayClass"
          :style="{ backgroundColor: CONCEPT_CARD_DIM_OVERLAY_COLOR }"
        />

        <div
          class="concept-card__gradient pointer-events-none absolute inset-0 z-[2]"
          :style="{ background: CONCEPT_CARD_TITLE_GRADIENT }"
        />

        <div class="concept-card__footer absolute bottom-0 left-0 right-0 z-[3] p-4">
          <h3
            class="concept-card__title line-clamp-2 truncate text-[16px] font-medium leading-6 tracking-[-0.4492px] text-white"
          >
            {{ concept.name }}
          </h3>
        </div>

        <div
          v-if="showCheckmark"
          class="concept-card__check absolute left-1 top-1 z-[4] flex items-center justify-center rounded-full border border-black/10 bg-white p-2 shadow-[0px_8px_5px_rgba(0,0,0,0.2)]"
        >
          <CheckIcon class="size-4 text-[#030213]" />
        </div>
      </template>
      <div
        v-else
        class="concept-card__empty flex h-full w-full items-center justify-center text-sm text-[#717182]"
      >
        —
      </div>
    </div>

    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showSelectionRing"
        class="concept-card__ring pointer-events-none absolute inset-0 z-[5] rounded-[14px] border-4 border-white"
        aria-hidden="true"
      />
    </Transition>
  </div>
</template>
