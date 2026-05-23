<script setup lang="ts">
interface Props {
  /** Number of skeleton tiles (default 6 = two rows of three). */
  count?: number
}

withDefaults(defineProps<Props>(), { count: 6 })
</script>

<template>
  <div
    class="concept-grid-skeleton grid grid-cols-3 gap-2 max-w-[506px]"
    aria-hidden="true"
  >
    <div
      v-for="i in count"
      :key="i"
      class="w-full aspect-square rounded-[16px] bg-muted animate-pulse"
    />
  </div>
</template>
