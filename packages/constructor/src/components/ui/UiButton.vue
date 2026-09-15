<script setup lang="ts">
import { computed, useSlots } from 'vue'
import {
  resolveUiButtonClasses,
  type UiButtonSize,
  type UiButtonVariant,
} from '@/components/ui/uiButton'

/**
 * Button primitive. Kit matrix lives in `uiButton.ts` — Figma `3333:5860`.
 *
 * There is one recipe. The `kit` prop that used to switch between the kit and
 * the pre-kit look was retired by phase 10 together with the raw `<button>`s of
 * the review screens; every call site renders the kit. Verify with:
 *   grep -rn '<UiButton' --include='*.vue' packages/constructor/src
 *
 * This is the labelled control. An icon-only round control is `UiIconButton`
 * (`3333:5541`), and a modal's close is a bare 24 glyph owned by `UiModal` —
 * three different kit recipes, deliberately not merged.
 */
interface UiButtonProps {
  /** Kit Style. */
  variant?: UiButtonVariant
  /** Kit Size: S-32 / M-40 / L-48. */
  size?: UiButtonSize
  loading?: boolean
  loadingLabel?: string
  disabled?: boolean
  /** Equal-width footer buttons (`flex-1`). */
  block?: boolean
  type?: 'button' | 'submit' | 'reset'
}

const props = withDefaults(defineProps<UiButtonProps>(), {
  variant: 'primary',
  size: 'L',
  loading: false,
  loadingLabel: 'Зачекайте…',
  disabled: false,
  block: false,
  type: 'button',
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const slots = useSlots()

const isDisabled = computed(() => props.disabled || props.loading)

const hasIconLeft = computed(() => Boolean(slots['icon-left']))
const hasIconRight = computed(() => Boolean(slots['icon-right']))

const classes = computed(() =>
  resolveUiButtonClasses({
    variant: props.variant,
    size: props.size,
    block: props.block,
  }),
)

/** Mirrors the kit's `Icon left` / `Icon right` frames. */
const ICON_BOX_CLASS = 'inline-flex shrink-0 items-center justify-center'
</script>

<template>
  <button
    :type="type"
    :class="classes.root"
    :disabled="isDisabled"
    @click="emit('click', $event)"
  >
    <span v-if="hasIconLeft" :class="ICON_BOX_CLASS">
      <slot name="icon-left" :icon-class="classes.icon" />
    </span>
    <span :class="classes.label">
      <template v-if="loading">{{ loadingLabel }}</template>
      <slot v-else />
    </span>
    <span v-if="hasIconRight" :class="ICON_BOX_CLASS">
      <slot name="icon-right" :icon-class="classes.icon" />
    </span>
  </button>
</template>
