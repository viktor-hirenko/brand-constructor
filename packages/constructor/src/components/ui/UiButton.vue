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
 * `kit` is off by default because four modal shells used to render the pre-kit
 * look. **Phase 6 moved the last of them over: as of 2026-09-15 every call site
 * in the tree passes `kit`, and the default branch has no consumers.** The prop
 * and `UI_BUTTON_LEGACY_*` are removed by phase 10, which converts the raw
 * `<button>`s of the review screens — same arrangement phase 1 used for the
 * `BRIEF_BTN_*` constants it left for phase 4. Verify with:
 *   grep -rn '<UiButton' --include='*.vue' packages/constructor/src
 */
interface UiButtonProps {
  /** Kit Style. `neutral` and `ghost` only exist in the kit recipe. */
  variant?: UiButtonVariant
  /** Kit Size: S-32 / M-40 / L-48. Only read when `kit` is set. */
  size?: UiButtonSize
  /** Render the Figma `3333:5860` recipe instead of the pre-kit one. */
  kit?: boolean
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
  kit: false,
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
    kit: props.kit,
    block: props.block,
    hasIcon: hasIconLeft.value || hasIconRight.value,
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
