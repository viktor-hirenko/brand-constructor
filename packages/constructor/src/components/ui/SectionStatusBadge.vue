<script setup lang="ts">
/**
 * «Потрібно обрати варіант» on a review section header. Kept as its own name
 * because eight review files ask for it by that name; the paint comes from
 * `StatusPillBadge` → `UiBadge` amber (DP-15258 phase 7).
 */
import StatusPillBadge from '@/components/ui/StatusPillBadge.vue'

interface SectionStatusBadgeProps {
  variant: 'attention'
  label?: string
}

withDefaults(defineProps<SectionStatusBadgeProps>(), {
  label: 'Потрібно обрати варіант',
})
</script>

<template>
  <StatusPillBadge class="section-status-badge" :label="label" tone="section-attention" />
</template>
