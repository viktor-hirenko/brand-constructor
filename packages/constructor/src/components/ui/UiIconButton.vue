<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { computed } from 'vue'
import {
  resolveUiIconButtonClasses,
  type UiIconButtonSize,
  type UiIconButtonVariant,
} from '@/components/ui/uiIconButton'

/**
 * Kit icon button — Figma `3333:5541`. Matrix lives in `uiIconButton.ts`.
 *
 * The default slot takes the glyph and is handed the resolved icon class
 * (`size-6` for L, `size-4` for S) so a call site drops in an icon component
 * without re-deriving the box:
 *
 *   <UiIconButton variant="glass" aria-label="…" @click="…">
 *     <template #default="{ iconClass }"><ArrowLeftIcon :class="iconClass" /></template>
 *   </UiIconButton>
 *
 * This is NOT the close control. The kit draws closing as a bare 24 glyph with
 * no button chrome — in the modal frames phase 6 matched (`5562:49171` and
 * four siblings) and again in the Preview panel header (`5377:26332`, an
 * instance of the plain `close` icon). `UiModal` owns that recipe; do not route
 * it through here.
 */
interface UiIconButtonProps {
  /** Kit Style: `solid` on a surface, `glass` over an image. */
  variant?: UiIconButtonVariant
  /** Kit Size: L-48 (24 glyph) or S-32 (16 glyph). */
  size?: UiIconButtonSize
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<UiIconButtonProps>(), {
  variant: 'solid',
  size: 'L',
  disabled: false,
  type: 'button',
  class: undefined,
})

const classes = computed(() =>
  resolveUiIconButtonClasses({ variant: props.variant, size: props.size })
)
</script>

<template>
  <button :type="props.type" :disabled="props.disabled" :class="[classes.root, props.class]">
    <slot :icon-class="classes.icon" />
  </button>
</template>
