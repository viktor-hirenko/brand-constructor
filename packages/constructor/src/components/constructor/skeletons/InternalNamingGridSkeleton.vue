<script setup lang="ts">
/**
 * Pixel-matched skeleton for `InternalNamingGrid`.
 *
 * Mirrors card geometry (h-128, rounded-16, border), grid layout
 * (3 cols, gap-2, max-w-506), and the two-line name block (`text-[20px] leading-6`
 * in `InternalNamingGrid` typically wraps two words to two rows) — a single skeleton
 * bar caused visible vertical CLS when names loaded on two lines.
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
      <!-- Two `leading-6` lines (~h-6 each) — matches wrapped internal naming titles. -->
      <div class="flex flex-col gap-1 w-full items-center px-2">
        <div class="h-6 w-4/5 max-w-[200px] rounded bg-muted animate-pulse" />
        <div class="h-6 w-[55%] max-w-[140px] rounded bg-muted animate-pulse" />
      </div>
    </div>
  </div>
</template>
