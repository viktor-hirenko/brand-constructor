<script setup lang="ts">
import { computed } from 'vue'
import type { HTMLAttributes } from 'vue'
import {
  UI_FIELD_CONTROL_CLASS,
  UI_FIELD_ICON_CLASS,
  resolveUiFieldSurfaceClasses,
} from '@/components/ui/uiField'

/**
 * Kit Input, Type = Default — Figma `3424:2287`. Recipe lives in `uiField.ts`.
 *
 *   <UiTextField v-model="linkedProduct" placeholder="Thor, Alpa..." />
 *
 * A 48-tall box: the surface is the wrapper `<div>` and the `<input>` inside it
 * is transparent. That is what lets the kit's Icon left / Icon right slots
 * exist without a second recipe, and it is why the focus border is
 * `focus-within:` — see `uiField.ts`.
 *
 * The kit's optional inner Label is NOT built here. On the matrix it turns the
 * box from 48 into 68, and every real Type = Default instance on the drawn
 * brief-order modal `5562:49171` ships it hidden. Its one carrier in this tree
 * is the CEO comment editor, which is an Area — so it lives in `UiTextarea`.
 *
 * `type` is deliberately narrow. The wizard needs text and number; a password
 * or a native date input would want a different kit component, and an unused
 * mode is the atom-without-a-consumer this task has four dead examples of.
 */
defineOptions({ inheritAttrs: false })

interface UiTextFieldProps {
  modelValue: string
  type?: 'text' | 'number'
  placeholder?: string
  /** Kit State = Error — swaps the border for `input/border/error`. */
  invalid?: boolean
  disabled?: boolean
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<UiTextFieldProps>(), {
  type: 'text',
  placeholder: '',
  invalid: false,
  disabled: false,
  class: undefined,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const surfaceClass = computed(() =>
  resolveUiFieldSurfaceClasses({
    invalid: props.invalid,
    disabled: props.disabled,
  })
)

function onInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}
</script>

<template>
  <div :class="[surfaceClass, props.class]">
    <slot name="icon-left" :icon-class="UI_FIELD_ICON_CLASS" />
    <input
      :type="props.type"
      :value="props.modelValue"
      :placeholder="props.placeholder"
      :disabled="props.disabled"
      :class="UI_FIELD_CONTROL_CLASS"
      v-bind="$attrs"
      @input="onInput"
    />
    <slot name="icon-right" :icon-class="UI_FIELD_ICON_CLASS" />
  </div>
</template>
