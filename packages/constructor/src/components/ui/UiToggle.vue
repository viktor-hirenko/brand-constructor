<script setup lang="ts">
import { computed } from 'vue'
import { resolveUiToggleClasses } from '@/components/ui/uiToggle'

/**
 * Kit toggle — Figma `3764:6920`, 48×24 with a ⌀20 thumb (measured off the
 * export, see `uiToggle.ts`). Two states only: the kit has no hover and no
 * disabled variant.
 *
 * ── Two call sites, two shapes of the same widget ────────────────────────────
 * Step 6 (`DeliverableToggleCard`) owns its state: the toggle *is* the control,
 * so it renders `<button role="switch">` and drives `v-model`.
 *
 * Step 7 (`VisualComponentsView`) puts the toggle inside a full-width row that
 * is itself a `<button>` — clicking anywhere on the row delegates the choice to
 * the designers, sometimes through a confirmation modal. A button inside a
 * button is invalid HTML and the inner one would swallow the row's click, so
 * that call site passes `decorative`: the toggle becomes a `<span>` with no
 * handlers and no tab stop, and the row keeps the behaviour it had.
 */
interface UiToggleProps {
  /** Renders a plain `<span>` with no handlers — for use inside a clickable row. */
  decorative?: boolean
  /** Accessible name. Required unless `decorative`, where the row names itself. */
  ariaLabel?: string
}

const props = withDefaults(defineProps<UiToggleProps>(), {
  decorative: false,
  ariaLabel: undefined,
})

const model = defineModel<boolean>({ default: false })

const classes = computed(() => resolveUiToggleClasses(model.value))

function toggle() {
  if (props.decorative) return
  model.value = !model.value
}
</script>

<template>
  <button
    v-if="!decorative"
    type="button"
    role="switch"
    :aria-checked="model"
    :aria-label="ariaLabel"
    :class="classes.track"
    @click="toggle"
  >
    <span :class="classes.thumb" />
  </button>
  <span v-else :class="classes.track" aria-hidden="true">
    <span :class="classes.thumb" />
  </span>
</template>
