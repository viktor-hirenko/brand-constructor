<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { computed } from 'vue'
import { resolveBrandBriefStatusBadge } from '@/components/constructor/review/brandBriefStatusBadge'
import StatusPillBadge from '@/components/ui/StatusPillBadge.vue'

const props = defineProps<{
  status: string
  class?: HTMLAttributes['class']
}>()

const meta = computed(() => resolveBrandBriefStatusBadge(props.status))
</script>

<template>
  <StatusPillBadge
    v-if="meta"
    :class="props.class"
    :label="meta.label"
    :tone="meta.tone"
    leading="none"
  />
</template>
