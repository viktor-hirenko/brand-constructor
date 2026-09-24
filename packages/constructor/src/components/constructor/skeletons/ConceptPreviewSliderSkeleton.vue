<script setup lang="ts">
/**
 * Pixel-matched skeleton for `ConceptPreviewSlider` (right preview column).
 *
 * Mirrors the header row (title + optional pill badge) and the square under it
 * so the right column does not flash empty state / shift while libraries
 * hydrate. Same three-part shape as the real panel — pinned header, scroll
 * area, square — or the square would jump the moment the real one arrives.
 *
 * `singleHeaderLine` — steps 3/4 (`ConceptMobilePreview`): one title bar only, no pill.
 */
import {
  PREVIEW_PANEL_HEADER_CLASS,
  PREVIEW_PANEL_HEADER_GAP_CLASS,
  PREVIEW_PANEL_ROOT_CLASS,
  PREVIEW_PANEL_SCROLL_CLASS,
  PREVIEW_PANEL_SQUARE_CLASS,
  PREVIEW_PANEL_SQUARE_RADIUS_CLASS,
} from '@/constants/previewLayout'

withDefaults(
  defineProps<{
    singleHeaderLine?: boolean
  }>(),
  { singleHeaderLine: false }
)
</script>

<template>
  <div :class="['concept-preview-slider-skeleton', PREVIEW_PANEL_ROOT_CLASS]" aria-hidden="true">
    <div :class="[PREVIEW_PANEL_HEADER_CLASS, PREVIEW_PANEL_HEADER_GAP_CLASS, 'justify-between']">
      <!-- `gap-2` mirrors the kit's `spacing/8` between name and badge in
           `ConceptPreviewSlider` — the two must stay equal or the pill jumps
           sideways when the real header replaces this one. -->
      <div :class="['min-w-0 flex flex-1 items-center', PREVIEW_PANEL_HEADER_GAP_CLASS]">
        <div class="h-8 w-[220px] rounded bg-muted animate-pulse" />
        <div
          v-if="!singleHeaderLine"
          class="h-6 w-[120px] rounded-full bg-muted animate-pulse shrink-0"
        />
      </div>
    </div>
    <div :class="PREVIEW_PANEL_SCROLL_CLASS">
      <div
        :class="[
          PREVIEW_PANEL_SQUARE_CLASS,
          PREVIEW_PANEL_SQUARE_RADIUS_CLASS,
          'bg-muted animate-pulse',
        ]"
      />
    </div>
  </div>
</template>
