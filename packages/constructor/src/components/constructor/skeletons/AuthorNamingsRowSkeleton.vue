<script setup lang="ts">
/**
 * Pixel-matched skeleton for `AuthorNamingsRow`.
 *
 * Mirrors label + 3-col grid of greyed-out customer pick cards
 * (bg-[#f1f1f3], px-6 py-10) so swapping between skeleton and content
 * does not cause CLS on External Naming author-pick blocks.
 */
interface Props {
  /** Number of skeleton tiles (default 3 = one row). */
  count?: number
}

withDefaults(defineProps<Props>(), { count: 3 })
</script>

<template>
  <div class="author-namings-row-skeleton flex flex-col gap-3" aria-hidden="true">
    <div class="h-6 w-[140px] rounded bg-muted animate-pulse" />
    <div class="author-namings-row-skeleton__grid grid grid-cols-3 gap-2 max-w-[506px]">
      <div
        v-for="i in count"
        :key="i"
        class="rounded-[16px] bg-[#f1f1f3] border border-black/10 flex flex-col items-center gap-2 px-6 py-10"
      >
        <div class="flex flex-col gap-1 w-full items-center">
          <div class="h-6 w-3/4 rounded bg-muted animate-pulse" />
          <div class="h-4 w-1/2 rounded bg-muted animate-pulse" />
        </div>
        <div class="h-6 w-1/3 rounded bg-muted animate-pulse" />
      </div>
    </div>
  </div>
</template>
