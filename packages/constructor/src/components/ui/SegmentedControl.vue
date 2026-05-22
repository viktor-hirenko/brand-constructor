<script setup lang="ts">
interface Option {
  value: string
  label: string
}

interface SegmentedControlProps {
  options: Option[]
  modelValue: string
  /** Accessible name for the control group */
  ariaLabel?: string
}

withDefaults(defineProps<SegmentedControlProps>(), {
  ariaLabel: undefined,
})

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <div
    class="segmented-control inline-flex self-start items-center rounded-[8px] bg-[#ececf0] p-0.5"
    role="group"
    :aria-label="ariaLabel"
  >
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="segmented-control__segment rounded-[6px] py-1.5 px-2 text-[14px] font-normal leading-4 tracking-[-0.3125px] transition-[background-color,color,box-shadow] duration-200"
      :class="
        modelValue === option.value
          ? 'bg-white text-[#030213] shadow-lg'
          : 'text-[#6b6b6b] hover:text-[#030213]'
      "
      @click="emit('update:modelValue', option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>
