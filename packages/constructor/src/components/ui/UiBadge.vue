<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { computed, useSlots } from 'vue'
import { resolveUiBadgeClasses, type UiBadgeTone } from '@/components/ui/uiBadge'

/**
 * Kit badge — Figma `3453:1619`, six tones, no border.
 *
 * The two icon slots mirror the kit's `Icon left` / `Icon right` and are handed
 * the resolved icon class, so a call site can drop in a glyph without
 * re-deriving the 16 box. The label is the default slot as well as a `label`
 * prop: most call sites pass plain text, a few need markup.
 */
interface UiBadgeProps {
  tone?: UiBadgeTone
  /** Plain-text label. For markup use the default slot instead. */
  label?: string
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<UiBadgeProps>(), {
  tone: 'neutral',
  label: '',
  class: undefined,
})

const slots = useSlots()

const classes = computed(() => resolveUiBadgeClasses(props.tone))
</script>

<template>
  <span :class="[classes.root, props.class]">
    <span v-if="slots.leading" :class="classes.icon">
      <slot name="leading" :icon-class="classes.icon" />
    </span>

    <span :class="classes.label">
      <slot>{{ label }}</slot>
    </span>

    <span v-if="slots.trailing" :class="classes.icon">
      <slot name="trailing" :icon-class="classes.icon" />
    </span>
  </span>
</template>
