<script setup lang="ts">
/**
 * Pixel-matched skeleton for `ConceptPreviewSlider` (right preview column).
 *
 * Mirrors the header row (title + optional pill badge) and the flex-1 canvas
 * so the right column does not flash empty state / shift while libraries hydrate.
 *
 * `singleHeaderLine` — steps 3/4 (`ConceptMobilePreview`): one title bar only, no pill.
 */
withDefaults(
  defineProps<{
    singleHeaderLine?: boolean
  }>(),
  { singleHeaderLine: false }
)
</script>

<template>
  <div
    class="concept-preview-slider-skeleton flex flex-col gap-6 h-full"
    aria-hidden="true"
  >
    <div class="flex items-center justify-between gap-4 shrink-0">
      <div class="min-w-0 flex items-center gap-3 flex-1 h-[48px]">
        <div class="h-8 w-[220px] rounded bg-muted animate-pulse" />
        <div
          v-if="!singleHeaderLine"
          class="h-9 w-[140px] rounded-full bg-muted animate-pulse shrink-0"
        />
      </div>
    </div>
    <div class="relative flex-1 min-h-0 rounded-[24px] bg-muted animate-pulse" />
  </div>
</template>
