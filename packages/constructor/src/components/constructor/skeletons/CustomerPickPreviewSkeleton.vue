<script setup lang="ts">
/**
 * Pixel-matched skeleton for `CustomerPickPreview`.
 *
 * Mirrors the final layout (label row + 162×162 rounded image) so swapping
 * between skeleton and content does not cause a CLS / layout shift on the
 * CEO reselect concept page.
 */
</script>

<template>
  <div class="customer-pick-preview-skeleton flex flex-col gap-3" aria-hidden="true">
    <div class="h-6 w-[120px] rounded bg-muted animate-pulse" />
    <div class="w-[162px] h-[162px] rounded-2xl bg-muted animate-pulse shrink-0" />
  </div>
</template>
