<script setup lang="ts">
import { computed } from 'vue'
import ChatBubbleIcon from '@/components/icons/ChatBubbleIcon.vue'

interface StepCommentFieldProps {
  /** Reactive comment value. */
  modelValue: string
  /** Label text above the textarea (defaults to "Коментар"). */
  label?: string
  /** Textarea placeholder. */
  placeholder?: string
  /** Textarea visible rows. */
  rows?: number
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
  required: false,
  requiredHint: '',
  optional: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const showRequiredHint = computed(() => props.required && !!props.requiredHint)

function onInput(event: Event) {
  const target = event.target as HTMLTextAreaElement
  emit('update:modelValue', target.value)
}
</script>

<template>
  <div class="step-comment-field pt-2 flex flex-col gap-2">
    <div class="step-comment-field__header flex items-center gap-2 h-6">
      <ChatBubbleIcon class="step-comment-field__icon text-[#5B5B62]" />
      <span
        class="step-comment-field__label text-[14px] font-medium leading-4 tracking-[-0.1504px] text-[#5b5b62]"
      >
        {{ label }}
        <span v-if="required" class="text-red-500">*</span>
        <span v-else-if="optional" class="text-[rgba(91,91,98,0.6)] font-normal">
          (необов'язково)
        </span>
      </span>
    </div>

    <textarea
      :value="modelValue"
      :rows="rows"
      :placeholder="placeholder"
      class="step-comment-field__textarea w-full px-4 py-4 bg-[rgba(197,197,200,0.2)] border-2 border-transparent rounded-[8px] resize-none text-[16px] leading-6 tracking-[-0.1504px] text-[#3d3d3d] placeholder:text-[rgba(61,61,61,0.5)] focus:outline-none focus:border-[#c8c7cc] transition-colors"
      @input="onInput"
    />

    <p
      v-if="showRequiredHint"
      class="step-comment-field__hint text-sm text-muted-foreground tracking-[-0.1504px]"
    >
      {{ requiredHint }}
    </p>
  </div>
</template>
