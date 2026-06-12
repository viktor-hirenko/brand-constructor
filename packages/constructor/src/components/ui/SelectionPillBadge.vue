<script setup lang="ts">
import { SELECTION_PILL_BADGE_CLASS } from '@/components/ui/selectionPillBadge'

defineProps<{
  label: string
}>()
</script>

<template>
  <span :class="SELECTION_PILL_BADGE_CLASS">{{ label }}</span>
</template>
