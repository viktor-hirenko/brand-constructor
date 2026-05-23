<script setup lang="ts">
/**
 * Pixel-matched skeleton for `CustomerInternalNamingPreview`.
 *
 * Mirrors label + single 128-height greyed-out customer pick card
 * (bg-[#f1f1f3]) so swapping between skeleton and content
 * does not cause CLS on Internal Naming customer-pick block.
 */
</script>

<template>
  <div
    class="customer-internal-naming-preview-skeleton flex flex-col gap-3"
    aria-hidden="true"
  >
    <div class="h-6 w-[140px] rounded bg-muted animate-pulse" />
    <div class="customer-internal-naming-preview-skeleton__grid grid grid-cols-3 gap-2 max-w-[506px]">
      <div
        class="h-[128px] rounded-[16px] bg-[#f1f1f3] border border-black/10 flex flex-col items-center justify-center px-6 py-10"
      >
        <div class="h-6 w-2/3 rounded bg-muted animate-pulse" />
      </div>
    </div>
  </div>
</template>
