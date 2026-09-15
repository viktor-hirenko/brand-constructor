<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import type { HTMLAttributes } from 'vue'
import {
  UI_FIELD_CONTROL_AREA_CLASS,
  UI_FIELD_INNER_LABEL_CLASS,
  computeTextareaAutosize,
  resolveUiFieldSurfaceClasses,
} from '@/components/ui/uiField'

/**
 * Kit Input, Type = Area — Figma `3424:2287`. Recipe lives in `uiField.ts`.
 *
 * Floor is the kit's 96 (`min-h-24`), which is also exactly what `rows="3"`
 * plus `py-3` measures out to: 3 × 24 + 12 + 12. The drawn brief-order modal
 * `5562:49171` puts every Area instance at 512×128 = Title 24 + gap 8 + 96.
 *
 * Autosize is opt-in (`autosize`) and measures the LIVE line-height instead of
 * assuming 24. Under the embed scale the root font-size is ~13px, so a line is
 * ~19.5px; the two hand-rolled autosizers this replaces both hard-coded 24 and
 * therefore over-sized every field on any panel narrower than 1440 — with no
 * test to catch it, since the embed scale has none.
 */
defineOptions({ inheritAttrs: false })

interface UiTextareaProps {
  modelValue: string
  placeholder?: string
  /** Visible lines before growth. 3 reproduces the kit's 96 floor. */
  rows?: number
  /** Lines before the field scrolls inside itself. Only with `autosize`. */
  maxRows?: number
  autosize?: boolean
  invalid?: boolean
  disabled?: boolean
  /** Kit inner Label `3436:4420` — caption l 14/16 above the value. */
  label?: string
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<UiTextareaProps>(), {
  placeholder: '',
  rows: 3,
  maxRows: 8,
  autosize: false,
  invalid: false,
  disabled: false,
  label: '',
  class: undefined,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  blur: [event: FocusEvent]
}>()

const textareaRef = ref<HTMLTextAreaElement | null>(null)

const surfaceClass = computed(() =>
  resolveUiFieldSurfaceClasses({
    type: 'area',
    invalid: props.invalid,
    disabled: props.disabled,
  })
)

function adjustHeight() {
  const el = textareaRef.value
  if (!el || !props.autosize) return

  const styles = window.getComputedStyle(el)
  const lineHeightPx = Number.parseFloat(styles.lineHeight)
  const verticalPaddingPx =
    Number.parseFloat(styles.paddingTop) + Number.parseFloat(styles.paddingBottom)
  if (!Number.isFinite(lineHeightPx)) return

  el.style.height = 'auto'
  const { heightPx, overflowY } = computeTextareaAutosize(
    el.scrollHeight,
    lineHeightPx,
    props.rows,
    props.maxRows,
    Number.isFinite(verticalPaddingPx) ? verticalPaddingPx : 0
  )
  el.style.height = `${heightPx}px`
  el.style.overflowY = overflowY
}

function onInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLTextAreaElement).value)
  adjustHeight()
}

onMounted(() => {
  void nextTick(adjustHeight)
})

watch(
  () => props.modelValue,
  () => {
    void nextTick(adjustHeight)
  }
)

defineExpose({ focus: () => textareaRef.value?.focus() })
</script>

<template>
  <div :class="[surfaceClass, props.class]">
    <span v-if="props.label" :class="UI_FIELD_INNER_LABEL_CLASS">{{ props.label }}</span>
    <textarea
      ref="textareaRef"
      :value="props.modelValue"
      :rows="props.rows"
      :placeholder="props.placeholder"
      :disabled="props.disabled"
      :class="[UI_FIELD_CONTROL_AREA_CLASS, props.autosize ? 'overflow-hidden' : '']"
      v-bind="$attrs"
      @input="onInput"
      @blur="emit('blur', $event)"
    />
  </div>
</template>
