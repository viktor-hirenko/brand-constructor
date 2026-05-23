<script setup lang="ts">
/**
 * Pixel-matched skeleton for `ConceptPreviewSlider` (right preview column).
 *
 * Mirrors the header row (title + pill badge) and the flex-1 slider canvas
 * so the right column does not flash empty state / shift while the CEO
 * reselect concept page hydrates.
 */
</script>

<template>
  <div class="concept-preview-slider-skeleton flex flex-col gap-6 h-full" aria-hidden="true">
    <div class="flex items-center justify-between gap-4 shrink-0">
      <div class="min-w-0 flex items-center gap-3 flex-1">
        <div class="h-8 w-[220px] rounded bg-muted animate-pulse" />
        <div class="h-9 w-[140px] rounded-full bg-muted animate-pulse shrink-0" />
      </div>
    </div>
    <div class="relative flex-1 min-h-0 rounded-[24px] bg-muted animate-pulse" />
  </div>
</template>
