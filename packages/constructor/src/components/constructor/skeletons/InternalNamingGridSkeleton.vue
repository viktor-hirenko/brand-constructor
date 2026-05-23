<script setup lang="ts">
/**
 * Pixel-matched skeleton for `InternalNamingGrid`.
 *
 * Mirrors card geometry (h-128, rounded-16, border) and grid layout
 * (3 cols, gap-2, max-w-506) so that swapping between skeleton and content
 * does not cause CLS on Internal Naming screens (PO wizard / CEO reselect / PO edit).
 */
interface Props {
  /** Number of skeleton tiles (default 6 = two rows of three). */
  count?: number
}

withDefaults(defineProps<Props>(), { count: 6 })
</script>

<template>
  <div
    class="internal-naming-grid-skeleton grid grid-cols-3 gap-2 max-w-[506px]"
    aria-hidden="true"
  >
    <div
      v-for="i in count"
      :key="i"
      class="internal-naming-grid-skeleton__card relative h-[128px] rounded-[16px] bg-white border border-black/10 flex flex-col items-center justify-center px-6 py-10"
    >
      <div class="h-6 w-2/3 rounded bg-muted animate-pulse" />
    </div>
  </div>
</template>
