<script setup lang="ts">
/**
 * Pixel-matched skeleton for `ConceptMobilePreview` (right-column iPhone-preview
 * shown on CEO reselect naming sub-routes and PO edit naming sub-routes).
 *
 * Mirrors the real component's geometry:
 *  - Outer column: `flex flex-col gap-6 h-full`
 *  - Static header "Обраний концепт" (kept as-is — non-data, prevents text flash)
 *  - Inner placeholder: `w-full aspect-square rounded-[24px]`, taking remaining
 *    column height via `flex-1` (matches the real preview slot).
 */
</script>

<template>
  <div class="concept-mobile-preview-skeleton flex flex-col gap-6 h-full" aria-hidden="true">
    <h3
      class="text-[24px] font-medium tracking-[-0.4492px] leading-8 text-[#e7e7e9] shrink-0"
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
