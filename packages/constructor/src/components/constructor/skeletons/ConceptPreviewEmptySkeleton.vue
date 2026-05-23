<script setup lang="ts">
/**
 * Skeleton for the CEO reselect concept right panel when CEO has NO saved
 * override yet. Pixel-matches the empty-state card (dashed rounded container
 * below the header-area spacer) so there is zero CLS when libraries resolve.
 */
</script>

<template>
  <div class="concept-preview-empty-skeleton flex flex-col h-full" aria-hidden="true">
    <!-- Spacer that matches the ConceptPreviewSlider header height (title + gap). -->
    <div class="shrink-0 h-[56px]" />
    <div
      class="flex-1 bg-[#f9f9fb] border border-dashed border-[rgba(0,0,0,0.1)] rounded-[24px]"
    />
  </div>
</template>
