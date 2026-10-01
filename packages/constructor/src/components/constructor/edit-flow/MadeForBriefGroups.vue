<script setup lang="ts" generic="T">
import EditFlowSectionLabel from './EditFlowSectionLabel.vue'

/**
 * A picker list split in two — what the team made for this brief's order
 * first, under «Створено для вашого брифу», then the library (brief-orders
 * plan, phase 2b). With nothing made the list renders exactly as before: one
 * group, no labels. The caller draws each group with its own grid through the
 * default slot, so the grids keep their selection rules untouched.
 */
defineProps<{
  made: T[]
  library: T[]
}>()

defineSlots<{
  default(props: { items: T[]; group: 'made' | 'library' }): unknown
}>()
</script>

<template>
  <div v-if="made.length > 0" class="made-for-brief-groups flex flex-col gap-6">
    <div class="made-for-brief-groups__made flex flex-col gap-2">
      <EditFlowSectionLabel>Створено для вашого брифу</EditFlowSectionLabel>
      <slot :items="made" group="made" />
    </div>
    <div v-if="library.length > 0" class="made-for-brief-groups__library flex flex-col gap-2">
      <EditFlowSectionLabel>Бібліотека</EditFlowSectionLabel>
      <slot :items="library" group="library" />
    </div>
  </div>
  <slot v-else :items="library" group="library" />
</template>
