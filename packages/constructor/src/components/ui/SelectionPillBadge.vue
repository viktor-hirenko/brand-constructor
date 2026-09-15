<script setup lang="ts">
/**
 * Grey pill next to a wizard heading («Обраний концепт», «Обраний пакет») — a
 * thin adapter over `UiBadge` (DP-15258 phase 7).
 *
 * It used to be its own recipe: 14/16 text, 8/12 padding, `#E7E7E9` fill,
 * `#030213` ink and a 15px backdrop blur, standing 32 tall. The redrawn Concept
 * Selection canvas (`5382:37507`) draws this badge as the plain kit neutral —
 * `caption m` 12/16 on `badge/bg/neutral`, 24 tall, no blur — so the adapter
 * hands it straight to `UiBadge`. Visibly smaller than before, and that is the
 * correction, not a regression.
 */
import UiBadge from '@/components/ui/UiBadge.vue'

defineProps<{
  label: string
}>()
</script>

<template>
  <UiBadge class="selection-pill-badge" tone="neutral" :label="label" />
</template>
