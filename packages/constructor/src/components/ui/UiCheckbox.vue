<script setup lang="ts">
import { computed } from 'vue'
import { resolveUiCheckboxClasses, UI_CHECKBOX_ICON_CLASS } from '@/components/ui/uiCheckbox'
import CheckIcon from '@/components/icons/CheckIcon.vue'

/**
 * Kit checkbox — Figma `3764:5499`, a 32 circle with two states and nothing
 * else (no hover, no disabled). Numbers and colours: see `uiCheckbox.ts`.
 *
 * This is a **presentational** element, not a control: every call site puts it
 * inside a row that is itself the button, so it renders a `<span aria-hidden>`
 * with no handlers and no tab stop. The row carries the accessible state.
 */
interface UiCheckboxProps {
  checked: boolean
}

const props = defineProps<UiCheckboxProps>()

const classes = computed(() => resolveUiCheckboxClasses(props.checked))
</script>

<template>
  <span :class="classes" aria-hidden="true">
    <CheckIcon v-if="checked" :class="UI_CHECKBOX_ICON_CLASS" />
  </span>
</template>
