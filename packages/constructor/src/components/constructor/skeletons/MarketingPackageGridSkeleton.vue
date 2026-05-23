<script setup lang="ts">
/**
 * Pixel-matched skeleton for the Marketing Package step grid.
 *
 * Mirrors card geometry (grid 1/2/3 cols, gap-6, min-h-280, border-2, p-6)
 * and the inner anatomy (icon block + title row + timeline block + features
 * block + bottom button) so swapping between skeleton and loaded content does
 * not cause CLS on the PR-Packages screen.
 */
interface Props {
  /** Number of skeleton tiles (default 3 — one per visible column on xl). */
  count?: number
}

withDefaults(defineProps<Props>(), { count: 3 })
</script>

<template>
  <div
    class="marketing-package-grid-skeleton grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
    aria-hidden="true"
  >
    <div
      v-for="i in count"
      :key="i"
      class="marketing-package-grid-skeleton__card relative rounded-[14px] overflow-hidden border-2 border-black/10 bg-white"
    >
      <div class="p-6 flex flex-col min-h-[280px] h-full gap-4">
        <!-- Header: Icon + Name -->
        <div class="flex items-start gap-3">
          <div class="size-12 rounded-[10px] bg-muted animate-pulse shrink-0" />
          <div class="h-6 w-1/2 rounded bg-muted animate-pulse mt-2.5" />
        </div>

        <!-- Timeline block -->
        <div class="p-3 rounded-[10px] bg-[rgba(236,236,240,0.5)] flex flex-col gap-2">
          <div class="h-3 w-1/3 rounded bg-muted animate-pulse" />
          <div class="h-4 w-2/3 rounded bg-muted animate-pulse" />
        </div>

        <!-- Features block -->
        <div class="p-3 rounded-[10px] bg-[rgba(236,236,240,0.5)] flex flex-col gap-2 flex-1">
          <div class="h-3 w-1/4 rounded bg-muted animate-pulse" />
          <div v-for="j in 4" :key="j" class="h-3 w-3/4 rounded bg-muted animate-pulse" />
        </div>

        <!-- Bottom button -->
        <div class="h-10 w-full rounded-[10px] border border-black/10 bg-muted/40 animate-pulse" />
      </div>
    </div>
  </div>
</template>
