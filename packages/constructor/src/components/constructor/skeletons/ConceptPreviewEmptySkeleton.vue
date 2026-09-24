<script setup lang="ts">
import { PREVIEW_HEADER_RESERVE_CLASS } from '@/constants/previewLayout'
/**
 * Skeleton for the concept right panel while libraries load and no concept is
 * selected yet. Matches the empty-state card (dashed container below the header
 * spacer) so there is no layout shift when `ConceptPreviewSlider` mounts.
 */
</script>

<template>
  <div class="concept-preview-empty-skeleton flex flex-col h-full gap-6" aria-hidden="true">
    <!-- Reserves the kit's 32 header, the same as the real one. It was 55 —
         header plus part of the gap, counted twice — so the square jumped by
         23 the moment the real header arrived. -->
    <div :class="['shrink-0', PREVIEW_HEADER_RESERVE_CLASS]" />
    <div class="flex-1 bg-[#f9f9fb] border border-dashed border-[rgba(0,0,0,0.1)] rounded-[24px]" />
  </div>
</template>
