<script setup lang="ts">
import { UI_STATUS_DOT_CLASS } from '@/components/ui/uiBadge'

/**
 * Kit status indicator — Figma `3761:1914`. A 6×6 dot in
 * `status indicator/info` `#3a5bc7`, decorative by default: the meaning it
 * carries ("this section has an unread comment") is spelled out by the text
 * around it, so it is hidden from screen readers unless a call site gives it a
 * label.
 */
interface UiStatusDotProps {
  /** Accessible name. Omitted → the dot is `aria-hidden`, as in the kit. */
  label?: string
}

const props = withDefaults(defineProps<UiStatusDotProps>(), { label: '' })
</script>

<template>
  <span
    :class="UI_STATUS_DOT_CLASS"
    :role="props.label ? 'img' : undefined"
    :aria-label="props.label || undefined"
    :aria-hidden="props.label ? undefined : 'true'"
  />
</template>
