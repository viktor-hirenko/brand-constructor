<script setup lang="ts">
interface Props {
  /** Number of skeleton tiles (default 6 = two rows of three). */
  count?: number
}

withDefaults(defineProps<Props>(), { count: 6 })
</script>

<template>
  <!-- Same `--wizard-concept-columns` as `ConceptGrid`; the two must agree. -->
  <div
    class="concept-grid-skeleton grid gap-2 [grid-template-columns:repeat(var(--wizard-concept-columns),minmax(0,1fr))]"
    aria-hidden="true"
  >
    <div
      v-for="i in count"
      :key="i"
      class="w-full aspect-square rounded-[16px] bg-muted animate-pulse"
    />
  </div>
</template>
