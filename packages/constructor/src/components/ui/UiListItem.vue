<script setup lang="ts">
import { computed } from 'vue'
import type { HTMLAttributes } from 'vue'
import {
  UI_LIST_ITEM_ICON_CLASS,
  UI_LIST_ITEM_LABEL_CLASS,
  resolveUiListItemClasses,
} from '@/components/ui/uiListItem'

/**
 * Kit List item — Figma `3446:5054`. Recipe lives in `uiListItem.ts`.
 *
 *   <UiListItem :selected="isSelected(geo.code)" @click="toggleGeo(geo.code)">
 *     <span class="font-medium">{{ geo.code }}</span>
 *     <template #trailing><CheckIcon class="size-4" /></template>
 *   </UiListItem>
 *
 * Renders a `<button>`: every list in the wizard is a menu of actions, none of
 * them navigates.
 *
 * The `#trailing` slot is ours — the kit's symbol has Icon left and Label and
 * nothing else — but the GEO list has always shown a check on the right, and
 * dropping it would turn "which of these are selected" into a colour-only cue.
 */
interface UiListItemProps {
  selected?: boolean
  disabled?: boolean
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<UiListItemProps>(), {
  selected: false,
  disabled: false,
  class: undefined,
})

const rootClass = computed(() =>
  resolveUiListItemClasses({ selected: props.selected, disabled: props.disabled })
)
</script>

<template>
  <button type="button" :disabled="props.disabled" :class="[rootClass, props.class]">
    <slot name="icon" :icon-class="UI_LIST_ITEM_ICON_CLASS" />
    <span :class="UI_LIST_ITEM_LABEL_CLASS"><slot /></span>
    <slot name="trailing" :icon-class="UI_LIST_ITEM_ICON_CLASS" />
  </button>
</template>
