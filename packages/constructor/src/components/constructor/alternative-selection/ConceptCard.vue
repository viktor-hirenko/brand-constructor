<script setup lang="ts">
/**
 * Single source of truth for the visual representation of a Concept card.
 *
 * Used by:
 *  - `ConceptGrid` (selectable grid with hover-overlay, optional selection ring)
 *  - `AuthorPickPreview` / `RevisionConceptView` (labelled single cards)
 *  - `PoEditConceptView` (header CEO/PO cards + post-apply applied card)
 *
 * States — Figma `3715:5610`, measured in DP-15258 phase 17:
 *  - Default:  image + 45% dim overlay, **no border**
 *  - Hovered:  dim overlay fades out, still no border
 *  - Selected: 2px #030213 border, white inner ring, check mark top-left
 *  - Preview:  no border, no dim, eye mark top-right
 *
 * Both marks are the kit's icon button Solid S-32, rendered decoratively —
 * the card is itself the button, so they must not be buttons of their own.
 */
import { computed } from 'vue'
import type { Concept } from '@brand-constructor/shared/types'
import { getAssetUrl } from '@/composables/useApi'
import {
  CONCEPT_CARD_BORDER_COLOR_SELECTED,
  CONCEPT_CARD_DIM_OVERLAY_COLOR,
  CONCEPT_CARD_TITLE_GRADIENT,
} from '@/constants/conceptCardVisual'
import { resolveUiIconButtonClasses } from '@/components/ui/uiIconButton'
import CheckIcon from '@/components/icons/CheckIcon.vue'
import EyeIcon from '@/components/icons/EyeIcon.vue'
import ImagePlaceholderIcon from '@/components/icons/ImagePlaceholderIcon.vue'

const props = withDefaults(
  defineProps<{
    concept: Concept | null
    isSelected?: boolean
    isActive?: boolean
    showSelectionRing?: boolean
    showCheckmark?: boolean
    /** Kit State = Preview — the eye mark on the card that drives the preview. */
    showPreviewMark?: boolean
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
    showPreviewMark: false,
    clickable: true,
    disabled: false,
    showOverlay: false,
  },
)

const emit = defineEmits<{
  click: []
}>()

const isHighlighted = computed(() => props.isSelected || props.isActive)

const conceptImageUrl = computed(() => {
  const c = props.concept
  if (!c) return null
  const url = c.visual_url || c.gallery_url_1
  return url && url.trim() !== '' ? url : null
})

const showDimOverlay = computed(
  () => props.showOverlay && props.concept != null && !isHighlighted.value,
)

const overlayClass = computed(() => {
  if (!showDimOverlay.value) return 'opacity-0'
  if (props.disabled || !props.clickable) return 'opacity-100'
  return 'opacity-100 group-hover:opacity-0'
})

/** The check and the eye share one chrome — kit `3715:5555` / `3715:5627`. */
const markClasses = computed(() =>
  resolveUiIconButtonClasses({ variant: 'solid', size: 'S', decorative: true }),
)

const showCheckMark = computed(() => props.showCheckmark)
const showEyeMark = computed(() => props.showPreviewMark && !props.showCheckmark)

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
      isSelected ? 'border-2' : '',
    ]"
    :style="isSelected ? { borderColor: CONCEPT_CARD_BORDER_COLOR_SELECTED } : undefined"
    @click="handleClick"
  >
    <div class="concept-card__media absolute inset-0 bg-muted">
      <template v-if="concept">
        <img
          v-if="conceptImageUrl"
          :src="getAssetUrl(conceptImageUrl)"
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

        <!-- Kit "Content" column: the mark row sits at the top with a
             `spacing/8` inset, the name row is pinned to the bottom and is the
             element that carries the gradient. -->
        <div
          class="concept-card__content pointer-events-none absolute inset-0 z-[3] flex flex-col"
        >
          <div
            v-if="showCheckMark || showEyeMark"
            class="concept-card__action flex shrink-0 items-start p-2"
            :class="showEyeMark ? 'justify-end' : 'justify-start'"
          >
            <span :class="markClasses.root">
              <CheckIcon v-if="showCheckMark" :class="markClasses.icon" />
              <EyeIcon v-else :class="markClasses.icon" />
            </span>
          </div>

          <div
            class="concept-card__footer mt-auto flex shrink-0 items-center p-4"
            :style="{ background: CONCEPT_CARD_TITLE_GRADIENT }"
          >
            <h3 class="concept-card__title min-w-0 flex-1 truncate text-base font-medium text-white">
              {{ concept.name }}
            </h3>
          </div>
        </div>
      </template>
      <div
        v-else
        class="concept-card__empty flex h-full w-full items-center justify-center text-sm text-ink-700"
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
