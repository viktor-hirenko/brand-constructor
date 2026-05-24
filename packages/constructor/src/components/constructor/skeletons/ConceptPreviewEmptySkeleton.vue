<script setup lang="ts">
/**
 * Skeleton for the concept right panel while libraries load and no concept is
 * selected yet. Matches the empty-state card (dashed container below the header
 * spacer) so there is no layout shift when `ConceptPreviewSlider` mounts.
 */
</script>

<template>
  <div class="concept-preview-empty-skeleton flex flex-col h-full gap-6" aria-hidden="true">
    <!-- Spacer that matches the ConceptPreviewSlider header height (title + gap). -->
    <div class="shrink-0 h-[55px]" />
    <div class="flex-1 bg-[#f9f9fb] border border-dashed border-[rgba(0,0,0,0.1)] rounded-[24px]" />
  </div>
</template>
