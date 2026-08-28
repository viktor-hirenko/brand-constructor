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
 * `kit` is off by default so that the four call sites still on the pre-kit look
 * (`ConfirmationModal`, `BriefModalShell`, `MarketingPackageView`,
 * `VisualComponentsView`) render exactly what they rendered before DP-15258.
 * They switch over in phases 4, 6 and 10; the flag goes away with the last one.
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
