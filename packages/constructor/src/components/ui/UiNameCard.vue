<script setup lang="ts">
import { computed } from 'vue'
import { resolveUiNameCardClasses, UI_NAME_CARD_NAME_CLASS } from '@/components/ui/uiNameCard'
import UiCheckbox from '@/components/ui/UiCheckbox.vue'

/**
 * Kit name card — Figma `3719:5978`, the row that replaces the square tiles on
 * steps 3 and 4. Numbers and colours: see `uiNameCard.ts`.
 *
 * The whole row is the control: it renders a `<button>` and the checkbox inside
 * it is presentational. `aria-pressed` carries the selected state, because the
 * screens this serves pick exactly one name out of a list rather than toggling
 * independent options.
 *
 * Step 4 (phase 15) needs the name and nothing else. The kit card also carries
 * a domain line, a price and a badge — all three are `hidden` on the step 4
 * instances, and they arrive with step 3 in phase 16, together with the call
 * sites that need them.
 */
interface UiNameCardProps {
  name: string
  selected?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<UiNameCardProps>(), {
  selected: false,
  disabled: false,
})

const emit = defineEmits<{
  select: []
}>()

const classes = computed(() =>
  resolveUiNameCardClasses({ selected: props.selected, disabled: props.disabled })
)

function handleClick() {
  if (props.disabled) return
  emit('select')
}
</script>

<template>
  <button
    type="button"
    :class="classes"
    :disabled="disabled"
    :aria-pressed="selected"
    @click="handleClick"
  >
    <UiCheckbox :checked="selected" />
    <span :class="UI_NAME_CARD_NAME_CLASS">{{ name }}</span>
  </button>
</template>
