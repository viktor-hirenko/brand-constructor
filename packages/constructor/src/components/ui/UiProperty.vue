<script setup lang="ts">
import { computed } from 'vue'
import type { HTMLAttributes } from 'vue'
import {
  UI_PROPERTY_ICON_CLASS,
  UI_PROPERTY_LABEL_CLASS,
  UI_PROPERTY_VALUE_CLASS,
  resolveUiPropertyContentClasses,
  resolveUiPropertyRowClasses,
  type UiPropertyType,
} from '@/components/ui/uiProperty'

/**
 * Kit Property — Figma `3761:2281`, four types. Recipe in `uiProperty.ts`.
 *
 *   <UiProperty type="icon-label-value" label="Географія" :value="geo">
 *     <template #icon="{ iconClass }"><GlobeIcon :class="iconClass" /></template>
 *   </UiProperty>
 *
 *   <UiProperty type="icon-value" :value="packageName">
 *     <template #icon="{ iconClass }"><MegaphoneIcon :class="iconClass" /></template>
 *     <template #trailing><UiLink @click="…">Переглянути</UiLink></template>
 *   </UiProperty>
 *
 *   <UiProperty type="label-value" label="Вибір замовника">
 *     <ul>…</ul>
 *   </UiProperty>
 *
 * The glyph comes through a slot and is handed the resolved icon class, the
 * same contract `UiFieldLabel`, `UiLink` and `UiButton` use — this component
 * decides the icon's size and colour, never which icon it is. Swapping the set
 * for the kit's Phosphor is phase 23 and is not agreed.
 *
 * `value` is a prop for the plain case and a default slot for the rich one
 * (a bullet list, a pair of concept cards). Passing both is meaningless, so
 * the slot wins and the prop is ignored.
 */
interface UiPropertyProps {
  type?: UiPropertyType
  label?: string
  value?: string
  /** Value keeps author line breaks — every review value did. */
  preserveLineBreaks?: boolean
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<UiPropertyProps>(), {
  type: 'icon-label-value',
  label: undefined,
  value: undefined,
  preserveLineBreaks: true,
  class: undefined,
})

const rowClass = computed(() => resolveUiPropertyRowClasses(props.type))
const contentClass = computed(() => resolveUiPropertyContentClasses(props.type))
</script>

<template>
  <div :class="[rowClass, props.class]">
    <slot name="icon" :icon-class="UI_PROPERTY_ICON_CLASS" />

    <div :class="contentClass">
      <p v-if="props.label" :class="UI_PROPERTY_LABEL_CLASS">{{ props.label }}</p>
      <slot>
        <p :class="[UI_PROPERTY_VALUE_CLASS, preserveLineBreaks ? 'whitespace-pre-line' : '']">
          {{ props.value }}
        </p>
      </slot>
    </div>

    <slot name="trailing" />
  </div>
</template>
