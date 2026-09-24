<script setup lang="ts">
/**
 * Skeleton for the concept right panel while libraries load and no concept is
 * selected yet. Matches the kit's `Type=Placeholder` `4492:11680` — an empty 32
 * header row above the square box — so there is no layout shift when
 * `ConceptPreviewSlider` mounts with its own empty state.
 */
import {
  PREVIEW_PANEL_HEADER_CLASS,
  PREVIEW_PANEL_PLACEHOLDER_CLASS,
  PREVIEW_PANEL_ROOT_CLASS,
  PREVIEW_PANEL_SCROLL_CLASS,
  PREVIEW_PANEL_SQUARE_CLASS,
  PREVIEW_PANEL_SQUARE_RADIUS_CLASS,
} from '@/constants/previewLayout'
</script>

<template>
  <div :class="['concept-preview-empty-skeleton', PREVIEW_PANEL_ROOT_CLASS]" aria-hidden="true">
    <!-- Reserves the kit's 32 header, the same as the real one. It was 55 —
         header plus part of the gap, counted twice — so the square jumped by
         23 the moment the real header arrived. -->
    <div :class="PREVIEW_PANEL_HEADER_CLASS" />
    <div :class="PREVIEW_PANEL_SCROLL_CLASS">
      <div
        :class="[
          PREVIEW_PANEL_SQUARE_CLASS,
          PREVIEW_PANEL_SQUARE_RADIUS_CLASS,
          PREVIEW_PANEL_PLACEHOLDER_CLASS,
        ]"
      />
    </div>
  </div>
</template>
