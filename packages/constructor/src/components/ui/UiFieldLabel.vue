<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import {
  UI_FIELD_ICON_CLASS,
  UI_FIELD_LABEL_CLASS,
  UI_FIELD_LABEL_OPTIONAL_CLASS,
  UI_FIELD_LABEL_REQUIRED_CLASS,
} from '@/components/ui/uiField'

/**
 * Kit Title — Figma `3424:1050`, the caption ABOVE an input. Recipe lives in
 * `uiField.ts`.
 *
 *   <UiFieldLabel required>
 *     <template #icon="{ iconClass }"><GlobeIcon :class="iconClass" /></template>
 *     GEO (Географія)
 *   </UiFieldLabel>
 *
 * The symbol is `[Icon 20] gap 8 [body/medium 16/24]` — so the glyph gets its
 * own slot and is handed the resolved icon class, the same way `UiLink` and
 * `UiButton` hand out theirs.
 *
 * Three call sites drew this at 16/24 already (step 1) and sixteen drew it at
 * 14/16 in #5b5b62 (`StepCommentField`). The kit has one Title, so they
 * converge on it: 16/24 medium in `input/title` #1f1f2e, glyph 20 not 16.
 *
 * Renders a `<label>` with no `for`, which is what every call site already had
 * — the inputs are siblings, not children. Wiring ids through 21 fields is a
 * separate accessibility pass, noted in the task document, not smuggled in
 * behind a вынос phase.
 */
interface UiFieldLabelProps {
  /** Appends the red asterisk. The kit draws none; the tree already did. */
  required?: boolean
  /** Appends "(необов'язково)". Mutually exclusive with `required`. */
  optional?: boolean
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<UiFieldLabelProps>(), {
  required: false,
  optional: false,
  class: undefined,
})
</script>

<template>
  <label :class="[UI_FIELD_LABEL_CLASS, props.class]">
    <slot name="icon" :icon-class="UI_FIELD_ICON_CLASS" />
    <span class="ui-field-label__text">
      <slot />
      <span v-if="props.required" :class="UI_FIELD_LABEL_REQUIRED_CLASS">*</span>
      <span v-else-if="props.optional" :class="UI_FIELD_LABEL_OPTIONAL_CLASS">
        (необов'язково)
      </span>
    </span>
  </label>
</template>
