<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { computed, useSlots } from 'vue'
import InfoCircleFilledIcon from '@/components/icons/InfoCircleFilledIcon.vue'
import UiBadge from '@/components/ui/UiBadge.vue'
import {
  resolveStatusPillTone,
  type StatusPillLeading,
  type StatusPillTone,
} from '@/components/ui/statusPillBadge'

/**
 * Brief-status badge — a thin adapter over `UiBadge` (DP-15258 phase 7).
 *
 * The name, the props and the `tone` vocabulary survive the sweep so the review
 * tree keeps compiling; the paint and the geometry now come from the kit badge
 * `3453:1619`. Two things changed on screen: the hairline border is gone (the
 * kit badge has none) and the `attention` marker is the same filled info circle
 * the Step 7 conflict chip already uses, in the tone's own colour, instead of a
 * hand-built `#DCA100` circle with an exclamation mark in it.
 */
interface StatusPillBadgeProps {
  label: string
  tone?: StatusPillTone
  leading?: StatusPillLeading
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<StatusPillBadgeProps>(), {
  tone: undefined,
  leading: undefined,
  class: undefined,
})

const slots = useSlots()

const toneMeta = computed(() => (props.tone ? resolveStatusPillTone(props.tone) : null))

const leadingKind = computed<StatusPillLeading>(() => {
  if (props.leading) return props.leading
  return toneMeta.value?.leading ?? 'none'
})

const showAttentionIcon = computed(() => leadingKind.value === 'attention' && !slots.leading)
</script>

<template>
  <UiBadge
    :class="['status-pill-badge', props.class]"
    :tone="toneMeta?.tone ?? 'neutral'"
    :label="label"
  >
    <template v-if="slots.leading || showAttentionIcon" #leading>
      <slot v-if="slots.leading" name="leading" />
      <InfoCircleFilledIcon v-else class="size-4 shrink-0" />
    </template>
  </UiBadge>
</template>
