<script setup lang="ts">
/**
 * Pixel-matched skeleton for `ConceptMobilePreview` (right-column preview on
 * naming steps). Mirrors header + flex-1 canvas geometry to avoid CLS.
 */
</script>

<template>
  <div class="concept-mobile-preview-skeleton flex flex-col gap-6 h-full" aria-hidden="true">
    <h3
      class="text-[24px] font-medium tracking-[-0.4492px] leading-8 text-[#0a0a0a] shrink-0"
    >
      Обраний концепт
    </h3>
    <div
      class="concept-mobile-preview-skeleton__frame w-full aspect-square rounded-[24px] overflow-hidden bg-muted/30 flex-1"
    >
      <div class="w-full h-full bg-muted animate-pulse" />
    </div>
  </div>
</template>
