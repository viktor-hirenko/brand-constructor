<script setup lang="ts">
/**
 * Pixel-matched skeleton for `AuthorInternalNamingPreview`.
 *
 * Mirrors label + single 128-height greyed-out customer pick card
 * (bg-[#f1f1f3]) so swapping between skeleton and content
 * does not cause CLS on Internal Naming author-pick block.
 */
</script>

<template>
  <div
    class="author-internal-naming-preview-skeleton flex flex-col gap-3"
    aria-hidden="true"
  >
    <div class="h-6 w-[140px] rounded bg-muted animate-pulse" />
    <div class="author-internal-naming-preview-skeleton__grid grid grid-cols-3 gap-2 max-w-[506px]">
      <div
        class="h-[128px] rounded-[16px] bg-[#f1f1f3] border border-black/10 flex flex-col items-center justify-center px-6 py-10"
      >
        <div class="flex flex-col gap-1 w-full items-center px-2">
          <div class="h-6 w-4/5 max-w-[200px] rounded bg-muted animate-pulse" />
          <div class="h-6 w-[55%] max-w-[140px] rounded bg-muted animate-pulse" />
        </div>
      </div>
    </div>
  </div>
</template>
