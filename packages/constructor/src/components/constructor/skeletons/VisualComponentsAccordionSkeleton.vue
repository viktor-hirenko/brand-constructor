<script setup lang="ts">
/**
 * Pixel-matched skeleton for the Visual Components accordion list.
 *
 * Mirrors the collapsed-row geometry (border + rounded-10 + px-4 py-3 header
 * with emoji circle + name placeholder + chevron) so the swap between skeleton
 * and the real accordion list does not cause CLS on the PO wizard Step 7.
 */
interface Props {
  /** Number of skeleton rows (default 5 — Header / Banners / Thumbnails / Tabbar / Sidebar;
   *  `ct_theme` is filtered out in `VisualComponentsView`, so 5 matches the rendered list). */
  count?: number
}

withDefaults(defineProps<Props>(), { count: 5 })
</script>

<template>
  <div class="visual-components-accordion-skeleton flex flex-col gap-2" aria-hidden="true">
    <div
      v-for="i in count"
      :key="i"
      class="visual-components-accordion-skeleton__row border border-black/10 rounded-[10px] overflow-hidden"
    >
      <div class="w-full px-4 py-3 bg-[#f3f3f5] flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="size-7 rounded-full bg-muted animate-pulse" />
          <div class="h-5 w-[120px] rounded bg-muted animate-pulse" />
        </div>
        <div class="size-5 rounded bg-muted animate-pulse" />
      </div>
    </div>
  </div>
</template>
