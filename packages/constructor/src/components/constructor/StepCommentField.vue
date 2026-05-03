<script setup lang="ts">
import { computed } from 'vue'

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
  /** Optional hint shown below when the field is required and empty. */
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

const hasValue = computed(() => (props.modelValue ?? '').trim().length > 0)
const showRequiredHint = computed(
  () => props.required && !!props.requiredHint && !hasValue.value
)

function onInput(event: Event) {
  const target = event.target as HTMLTextAreaElement
  emit('update:modelValue', target.value)
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex items-center gap-2 h-6">
      <svg
        class="size-5 shrink-0"
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M17.5 10.6323V5.61768C17.5 4.57011 16.7694 3.69157 15.778 3.54574V3.54492C13.8649 3.26416 11.9336 3.12439 10 3.125C8.03728 3.125 6.10774 3.26851 4.22201 3.54574C3.23072 3.69155 2.5 4.57082 2.5 5.61768V10.6331C2.5 11.679 3.23061 12.5584 4.22201 12.7043C5.14811 12.8404 6.08397 12.9446 7.02962 13.0151C7.44987 13.0464 7.84078 13.2438 8.11361 13.5636L8.22347 13.7077L8.22428 13.7093L10 16.3729L11.7773 13.7069C11.9109 13.5084 12.0879 13.3425 12.2949 13.2227C12.5014 13.1031 12.7324 13.0324 12.9704 13.0151L13.6743 12.9565C14.3776 12.8914 15.0791 12.807 15.778 12.7043C16.7694 12.5584 17.5 11.6799 17.5 10.6323ZM10 8.75C10.3452 8.75 10.625 9.02982 10.625 9.375C10.625 9.72018 10.3452 10 10 10H6.25C5.90482 10 5.625 9.72018 5.625 9.375C5.625 9.02982 5.90482 8.75 6.25 8.75H10ZM13.75 6.25C14.0952 6.25 14.375 6.52982 14.375 6.875C14.375 7.22018 14.0952 7.5 13.75 7.5H6.25C5.90482 7.5 5.625 7.22018 5.625 6.875C5.625 6.52982 5.90482 6.25 6.25 6.25H13.75ZM18.75 10.6323C18.75 12.2547 17.6088 13.6987 15.9603 13.9412C14.9988 14.0827 14.0323 14.1895 13.0632 14.2619H13.0607C13.0116 14.2654 12.9642 14.2803 12.9215 14.305C12.8795 14.3293 12.8423 14.3618 12.8149 14.4019L12.8158 14.4027L10.52 17.8467C10.4041 18.0206 10.209 18.125 10 18.125C9.79103 18.125 9.59589 18.0206 9.47998 17.8467L7.18424 14.4027V14.4019C7.1438 14.3423 7.08262 14.2977 7.01172 14.2757L6.93685 14.2619C5.96099 14.1891 4.99513 14.0817 4.03971 13.9412C2.39117 13.6987 1.25 12.2539 1.25 10.6331V5.61768C1.25 3.99623 2.39105 2.55132 4.03971 2.30876C5.98556 2.02268 7.97615 1.875 10 1.875L10.7479 1.88151C12.243 1.90836 13.7356 2.01693 15.2189 2.20703L15.9603 2.30876L16.1133 2.33561C17.679 2.64234 18.75 4.046 18.75 5.61768V10.6323Z"
          fill="#5B5B62"
        />
      </svg>
      <span
        class="text-[14px] font-medium leading-4 tracking-[-0.1504px] text-[#5b5b62]"
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
      class="w-full px-4 py-4 bg-[rgba(197,197,200,0.2)] border-2 border-transparent rounded-[8px] resize-none text-[16px] leading-6 tracking-[-0.1504px] text-[#3d3d3d] placeholder:text-[rgba(61,61,61,0.5)] focus:outline-none focus:border-[#c8c7cc] transition-colors"
      @input="onInput"
    />

    <p
      v-if="showRequiredHint"
      class="text-xs text-muted-foreground tracking-[-0.1504px]"
    >
      {{ requiredHint }}
    </p>
  </div>
</template>
