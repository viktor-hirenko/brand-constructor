<script setup lang="ts">
/**
 * Pixel-matched skeleton for `ConceptMobilePreview` (right-column preview on
 * naming steps). Mirrors the pinned header and the square under it to avoid CLS.
 */
import {
  PREVIEW_PANEL_HEADER_CLASS,
  PREVIEW_PANEL_ROOT_CLASS,
  PREVIEW_PANEL_SCROLL_CLASS,
  PREVIEW_PANEL_SQUARE_CLASS,
  PREVIEW_PANEL_SQUARE_RADIUS_CLASS,
  PREVIEW_PANEL_TITLE_CLASS,
} from '@/constants/previewLayout'
</script>

<template>
  <div :class="['concept-mobile-preview-skeleton', PREVIEW_PANEL_ROOT_CLASS]" aria-hidden="true">
    <h3 :class="[PREVIEW_PANEL_HEADER_CLASS, PREVIEW_PANEL_TITLE_CLASS, 'truncate']">
      Обраний концепт
    </h3>
    <div :class="PREVIEW_PANEL_SCROLL_CLASS">
      <div
        :class="[
          'concept-mobile-preview-skeleton__frame',
          PREVIEW_PANEL_SQUARE_CLASS,
          PREVIEW_PANEL_SQUARE_RADIUS_CLASS,
          'overflow-hidden bg-muted animate-pulse',
        ]"
      />
    </div>
  </div>
</template>
