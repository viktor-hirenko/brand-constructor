<script setup lang="ts">
import type { NamingPriceHealth } from '@brand-constructor/shared'

/**
 * Above the namings table when last night's price check did not reach a
 * marketplace: a silent one changes nothing in the records, so without this
 * line a stale price looks like a checked one. Nothing is drawn on a good
 * night. The sentences come from the server — Slack gets the same ones.
 */
defineProps<{ health: NamingPriceHealth | null }>()
</script>

<template>
  <ul v-if="health?.problems.length" class="price-health" role="status">
    <li v-for="problem in health.problems" :key="`${problem.kind}-${problem.source ?? ''}`" class="price-health__line">
      {{ problem.text }}
    </li>
  </ul>
</template>

<style lang="scss" scoped>
.price-health {
  display: flex;
  flex-direction: column;
  gap: $spacing-1;
  margin: 0 0 $spacing-3;
  padding: $spacing-2 $spacing-3;
  list-style: none;
  border: 1px solid #fcd34d;
  border-radius: $radius-md;
  background: #fffbeb;
  color: #92400e;
  font-size: $font-size-sm;
  line-height: $line-height-normal;
}
</style>
