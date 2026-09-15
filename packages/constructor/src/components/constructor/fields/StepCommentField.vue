<script setup lang="ts">
import { computed } from 'vue'
import ChatBubbleIcon from '@/components/icons/ChatBubbleIcon.vue'
import UiFieldHint from '@/components/ui/UiFieldHint.vue'
import UiFieldLabel from '@/components/ui/UiFieldLabel.vue'
import UiTextarea from '@/components/ui/UiTextarea.vue'

/**
 * Step comment field — the most-used field in the wizard (16 call sites).
 *
 * Phase 11 rebuilt its insides on the kit primitives (`UiFieldLabel` Title
 * `3424:1050`, `UiTextarea` Input Type = Area `3424:2287`, `UiFieldHint`
 * Description `3424:5408`) and **left the props exactly as they were**. Nothing
 * outside this file changed: the same 16 callers pass the same
 * `v-model` / `label` / `required` / `required-hint` / `optional` / `class`.
 * That is the adapter trick phase 7 used for the three badges, and for the same
 * reason — an API change here is 16 files of churn for zero pixels.
 *
 * What DID change, on purpose, is what the kit says:
 *   - the label is the kit Title: 16/24 medium in #1f1f2e with a 20 glyph,
 *     where it used to be 14/16 in #5b5b62 with a 16 glyph;
 *   - the box is the kit Area: #f3f3f5 fill, #eaeaeb border, #cacace on focus,
 *     placeholder #95959d, floor 96. It used to be a transparent 2px border on
 *     `rgba(197,197,200,0.2)` with the focus recipe on the border width;
 *   - autosize measures the live line-height instead of assuming 24 — see
 *     `computeTextareaAutosize` in `uiField.ts` for why that mattered in embed.
 */
interface StepCommentFieldProps {
  /** Reactive comment value. */
  modelValue: string
  /** Label text above the textarea (defaults to "Коментар"). */
  label?: string
  /** Textarea placeholder. */
  placeholder?: string
  /** Minimum visible rows before autosize kicks in. 3 = the kit's 96 floor. */
  rows?: number
  /** Maximum rows before internal scroll appears. */
  maxRows?: number
  /** Marks the field as required — shows a red asterisk next to the label. */
  required?: boolean
  /** Hint below the field while `required` is true (e.g. multi/sold external naming). */
  requiredHint?: string
  /** Optional "(необов'язково)" suffix shown next to the label. */
  optional?: boolean
}

const props = withDefaults(defineProps<StepCommentFieldProps>(), {
  label: 'Коментар',
  placeholder: 'Додайте ваші коментарі або побажання...',
  rows: 3,
  maxRows: 8,
  required: false,
  requiredHint: '',
  optional: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const showRequiredHint = computed(() => props.required && !!props.requiredHint)

const value = computed({
  get: () => props.modelValue,
  set: (next: string) => emit('update:modelValue', next),
})
</script>

<template>
  <div class="step-comment-field pt-2 flex flex-col gap-2">
    <UiFieldLabel
      class="step-comment-field__header"
      :required="props.required"
      :optional="props.optional"
    >
      <template #icon="{ iconClass }">
        <ChatBubbleIcon :class="iconClass" />
      </template>
      {{ props.label }}
    </UiFieldLabel>

    <UiTextarea
      v-model="value"
      class="step-comment-field__textarea"
      autosize
      :rows="props.rows"
      :max-rows="props.maxRows"
      :placeholder="props.placeholder"
    />

    <UiFieldHint v-if="showRequiredHint" class="step-comment-field__hint">
      {{ props.requiredHint }}
    </UiFieldHint>
  </div>
</template>
