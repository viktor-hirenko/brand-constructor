<script setup lang="ts">
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
  <StatusPillBadge :label="label" tone="section-attention" />
</template>
