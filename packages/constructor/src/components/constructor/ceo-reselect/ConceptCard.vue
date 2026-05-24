<script setup lang="ts">
/**
 * Single source of truth for the visual representation of a Concept card.
 *
 * Used by:
 *  - `ConceptGrid` (selectable grid with hover-overlay, optional selection ring)
 *  - `PoEditConceptView` (header CEO/PO cards + post-apply applied card)
 *  - Any future place that needs to render a concept tile.
 *
 * The card is always `w-full aspect-square` — outer width is controlled by the
 * parent (grid column, fixed-size wrapper, etc.). Selection visuals (dark
 * border, white inner ring, checkmark badge) are toggled via props so every
 * caller gets the same consistent look without duplicating markup.
 */
import type { Concept } from '@brand-constructor/shared/types'
import { getAssetUrl } from '@/composables/useApi'
import CheckIcon from '@/components/icons/CheckIcon.vue'
import ImagePlaceholderIcon from '@/components/icons/ImagePlaceholderIcon.vue'

const props = withDefaults(
  defineProps<{
    /** Concept data; `null` renders an empty placeholder card. */
    concept: Concept | null
    /** Dark border ("обрано" state). */
    isSelected?: boolean
    /** `isSelected || isPreviewed` — drives hover-overlay visibility in grid mode. */
    isActive?: boolean
    /** Inner white ring rendered on top of the selected border (double-border effect). */
    showSelectionRing?: boolean
    /** White circular checkmark badge in the top-left corner. */
    showCheckmark?: boolean
    /** Whether the card is clickable; non-clickable cards have `cursor-default` and no hover behavior. */
    clickable?: boolean
    /** Disabled cards show `cursor-not-allowed` and don't emit click. */
    disabled?: boolean
    /** Dark 45% overlay shown when card is not active (and removed on hover when clickable). */
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

function handleClick() {
  if (props.disabled || !props.clickable) return
  emit('click')
}
</script>

<template>
  <div
    class="concept-card group relative rounded-[16px] overflow-hidden transition-[border-color,opacity] duration-200 w-full aspect-square border-2"
    :class="[
      disabled
        ? 'cursor-not-allowed'
        : clickable
          ? 'cursor-pointer'
          : 'cursor-default',
      isSelected || isActive ? 'border-[#030213]' : 'border-[rgba(3,2,19,0.1)]',
    ]"
    @click="handleClick"
  >
    <div class="concept-card__media w-full h-full absolute inset-0 bg-muted">
      <template v-if="concept">
        <img
          v-if="concept.visual_url"
          :src="getAssetUrl(concept.visual_url)"
          :alt="concept.name"
          class="concept-card__image w-full h-full object-cover"
          loading="lazy"
          decoding="async"
        />
        <div
          v-else
          class="concept-card__placeholder w-full h-full flex items-center justify-center text-muted-foreground"
        >
          <ImagePlaceholderIcon class="size-12 opacity-30" />
        </div>

        <div
          v-if="showOverlay"
          class="concept-card__overlay absolute inset-0 bg-black/45 transition-opacity z-[1] pointer-events-none"
          :class="
            isActive
              ? 'opacity-0'
              : disabled
                ? 'opacity-100'
                : clickable
                  ? 'opacity-100 group-hover:opacity-0'
                  : 'opacity-100'
          "
        />

        <div
          class="concept-card__gradient absolute inset-0 bg-gradient-to-t from-black/[0.75] via-transparent to-transparent z-[2] pointer-events-none"
        />

        <div class="concept-card__footer absolute bottom-0 left-0 right-0 p-4 z-[3]">
          <h3
            class="concept-card__title text-white font-medium text-[18px] leading-6 tracking-[-0.4492px] line-clamp-2 truncate"
          >
            {{ concept.name }}
          </h3>
        </div>

        <div
          v-if="showCheckmark"
          class="concept-card__check absolute top-[6px] left-[6px] size-8 rounded-full bg-white border border-black/10 flex items-center justify-center shadow-[0px_8px_10px_0px_rgba(0,0,0,0.2)] z-[4]"
        >
          <CheckIcon class="size-4 text-[#030213]" />
        </div>
      </template>
      <div
        v-else
        class="concept-card__empty w-full h-full flex items-center justify-center text-sm text-[#717182]"
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
