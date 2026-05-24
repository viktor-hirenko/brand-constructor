<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { computed, useSlots } from 'vue'
import {
  STATUS_PILL_BADGE_ICON_CLASS,
  STATUS_PILL_BADGE_INNER_CLASS,
  STATUS_PILL_BADGE_LABEL_CLASS,
  STATUS_PILL_BADGE_OUTER_CLASS,
  resolveStatusPillTone,
  type StatusPillLeading,
  type StatusPillTone,
} from '@/components/ui/statusPillBadge'

interface StatusPillBadgeProps {
  label: string
  tone?: StatusPillTone
  leading?: StatusPillLeading
  surfaceClass?: HTMLAttributes['class']
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<StatusPillBadgeProps>(), {
  tone: undefined,
  leading: undefined,
  surfaceClass: undefined,
  class: undefined,
})

const slots = useSlots()

const toneMeta = computed(() => (props.tone ? resolveStatusPillTone(props.tone) : null))

const leadingKind = computed<StatusPillLeading>(() => {
  if (props.leading) return props.leading
  return toneMeta.value?.leading ?? 'none'
})

const showAttentionIcon = computed(
  () => leadingKind.value === 'attention' && !slots.leading
)

const outerClass = computed(() => [
  STATUS_PILL_BADGE_OUTER_CLASS,
  toneMeta.value?.surfaceClass,
  props.surfaceClass,
  props.class,
])
</script>

<template>
  <span :class="outerClass">
    <span :class="STATUS_PILL_BADGE_INNER_CLASS">
      <slot v-if="slots.leading" name="leading" />
      <span
        v-else-if="showAttentionIcon"
        :class="STATUS_PILL_BADGE_ICON_CLASS"
        aria-hidden="true"
      >!</span>
      <span :class="STATUS_PILL_BADGE_LABEL_CLASS">{{ label }}</span>
    </span>
  </span>
</template>
