<script setup lang="ts">
/**
 * Pixel-matched skeleton for `ExternalNamingGrid`.
 *
 * Mirrors card geometry (border-2, rounded-16, px-6 py-10) and grid layout
 * (3 cols, gap-2, max-w-506) so that swapping between skeleton and content
 * does not cause CLS on External Naming screens (PO wizard / CEO reselect / PO edit).
 */
interface Props {
  /** Number of skeleton tiles (default 6 = two rows of three). */
  count?: number
}

withDefaults(defineProps<Props>(), { count: 6 })
</script>

<template>
  <div
    class="external-naming-grid-skeleton grid grid-cols-3 gap-2 max-w-[506px]"
    aria-hidden="true"
  >
    <div
      v-for="i in count"
      :key="i"
      class="external-naming-grid-skeleton__card relative box-border rounded-[16px] bg-white flex flex-col items-center gap-2 px-6 py-10 border-2 border-solid border-black/10"
    >
      <div class="flex flex-col gap-1 w-full items-center">
        <div class="h-6 w-3/4 rounded bg-muted animate-pulse" />
        <div class="h-4 w-1/2 rounded bg-muted animate-pulse" />
      </div>
      <div class="h-6 w-1/3 rounded bg-muted animate-pulse" />
      <!-- Badge placeholder (matches real card's "Available" badge geometry):
           px-2 py-1 rounded-[8px], visible row at the bottom of the card. -->
      <div class="h-6 w-[72px] rounded-[8px] bg-muted animate-pulse" />
    </div>
  </div>
</template>
